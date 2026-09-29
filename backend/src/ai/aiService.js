import { completeJSON, completeText, isLLMConfigured } from './llmClient.js';
import { prompts } from './prompts.js';
import * as fallback from './localFallback.js';
import { cacheService, cacheKeys } from '../services/cacheService.js';
import { Skill } from '../models/index.js';
import { resolveSkillsWithCatalog, dedupeSkills } from '../utils/skills.js';

/**
 * AI Service — the single logical boundary between the application and the LLM.
 *
 * Responsibilities:
 *  - Build prompts, call the LLM, validate/normalize outputs.
 *  - Enforce the caching policy: reusable content (topic explanations, generic
 *    question banks, JD skill extraction) goes through Redis cache-aside;
 *    personalized analyses bypass the shared cache entirely (their results are
 *    persisted per-user in MongoDB by the workers).
 *  - Fall back to deterministic local analyzers when no LLM key is configured,
 *    so every feature degrades gracefully instead of breaking.
 *
 * Controllers/workers call THIS module — never the LLM SDK directly.
 */

async function canonicalize(skills) {
  const aliasMap = await Skill.buildAliasMap();
  return resolveSkillsWithCatalog(skills, aliasMap);
}

export const aiService = {
  isConfigured: isLLMConfigured,

  /** Extract structured hiring data from a JD. Cached: same JD text → same result for everyone. */
  async extractJobSkills(description) {
    const key = cacheKeys.jobSkillExtraction(description);
    const { value, cached } = await cacheService.wrap(key, cacheService.ttls.jobExtraction, async () => {
      if (!isLLMConfigured()) {
        const skills = await fallback.localSkillExtraction(description);
        return { requiredSkills: skills, niceToHaveSkills: [], responsibilities: [], role: null, experienceLevel: 'any', source: 'local' };
      }
      const p = prompts.jobSkillExtraction(description);
      const out = await completeJSON(p.system, p.user, { temperature: 0.1 });
      return {
        role: out.role || null,
        requiredSkills: await canonicalize(out.requiredSkills || []),
        niceToHaveSkills: await canonicalize(out.niceToHaveSkills || []),
        responsibilities: (out.responsibilities || []).slice(0, 12),
        experienceLevel: ['fresher', 'intern', 'junior', 'mid', 'any'].includes(out.experienceLevel) ? out.experienceLevel : 'any',
        source: 'llm',
      };
    });
    return { ...value, cached };
  },

  /** Analyze a resume. PERSONALIZED — never shared-cached; worker persists result in AIAnalysis. */
  async analyzeResume(resumeText, profileSummary) {
    if (!isLLMConfigured()) {
      const base = fallback.localResumeAnalysis(resumeText);
      base.skills = await fallback.localSkillExtraction(resumeText);
      base.source = 'local';
      return base;
    }
    const p = prompts.resumeAnalysis(resumeText, profileSummary);
    const out = await completeJSON(p.system, p.user, { temperature: 0.2, maxTokens: 1500 });
    return {
      skills: await canonicalize(out.skills || []),
      strengths: out.strengths || [],
      weaknesses: out.weaknesses || [],
      missingEssentials: await canonicalize(out.missingEssentials || []),
      projectFeedback: out.projectFeedback || '',
      resumeTips: out.resumeTips || [],
      readinessScore: clamp(out.readinessScore, 0, 10),
      suitableRoles: out.suitableRoles || [],
      source: 'llm',
    };
  },

  /** Prioritize missing skills. Personalized → no shared cache. */
  async adviseOnSkillGap(input) {
    if (!isLLMConfigured()) {
      return {
        overallAssessment: `You match ${input.matched.length} of ${input.matched.length + input.missing.length} required skills.`,
        priorityOrder: input.missing,
        reasoning: input.missing.map((s) => ({ skill: s, why: 'Listed as required by the target job.' })),
        quickWins: input.missing.slice(0, 2),
        source: 'local',
      };
    }
    const p = prompts.skillGapAdvice(input);
    const out = await completeJSON(p.system, p.user, { temperature: 0.3 });
    return {
      overallAssessment: out.overallAssessment || '',
      priorityOrder: out.priorityOrder || input.missing,
      reasoning: out.reasoning || [],
      quickWins: out.quickWins || [],
      source: 'llm',
    };
  },

  /** Generate roadmap tasks. Personalized → no shared cache. */
  async generateRoadmap(input) {
    if (!isLLMConfigured()) {
      return { ...fallback.localRoadmap(input), source: 'local' };
    }
    const p = prompts.roadmap(input);
    const out = await completeJSON(p.system, p.user, { temperature: 0.4, maxTokens: 3500 });
    return {
      title: out.title || `Roadmap — ${input.role}`,
      overview: out.overview || '',
      targetDate: out.targetDate || null,
      tasks: (out.tasks || []).map((t, i) => ({
        title: String(t.title || `Task ${i + 1}`).slice(0, 300),
        description: String(t.description || '').slice(0, 2000),
        category: validCategory(t.category),
        topic: t.topic || '',
        priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        estimatedHours: Number(t.estimatedHours) || 4,
        order: Number(t.order ?? i),
      })),
      source: 'llm',
    };
  },

  /**
   * Interview questions for a round.
   * Resume-round questions are PERSONALIZED (built from candidate context) → no shared cache.
   * Generic rounds (DSA/SQL/...) CAN be cached per role+round+difficulty.
   */
  async getInterviewQuestions({ round, role, count, difficulty, resumeContext, askedBefore }) {
    const personalized = round === 'resume' || Boolean(resumeContext);
    if (!isLLMConfigured()) return { ...fallback.localInterviewQuestions({ round, count }), cached: false, source: 'local' };

    if (!personalized) {
      const key = cacheKeys.questionBank(role, round, difficulty, count);
      const { value, cached } = await cacheService.wrap(key, cacheService.ttls.question, async () => {
        const p = prompts.interviewQuestions({ round, role, count, difficulty, askedBefore });
        return normalizeQuestions(await completeJSON(p.system, p.user));
      });
      return { ...value, cached, source: 'llm' };
    }

    const p = prompts.interviewQuestions({ round, role, count, difficulty, resumeContext, askedBefore });
    const out = await normalizeQuestions(await completeJSON(p.system, p.user));
    return { ...out, cached: false, source: 'llm' };
  },

  async getFollowUp({ question, answer, round }) {
    if (!isLLMConfigured()) return fallback.localFollowUp({ question, round });
    const p = prompts.followUp({ question, answer, round });
    const out = await completeJSON(p.system, p.user, { temperature: 0.6, maxTokens: 300 });
    return { text: String(out.text || '').slice(0, 1000), topic: out.topic || round };
  },

  /** Final interview report. Personalized → no shared cache. */
  async generateInterviewReport({ role, transcript, qaCount }) {
    if (!isLLMConfigured()) return fallback.localInterviewReport({ role, qaCount });
    const p = prompts.interviewReport({ role, transcript });
    const out = await completeJSON(p.system, p.user, { temperature: 0.3, maxTokens: 2500 });
    return {
      overallRating: clamp(out.overallRating, 1, 10),
      verdict: ['not-ready', 'needs-practice', 'ready', 'strong'].includes(out.verdict) ? out.verdict : 'needs-practice',
      strengths: out.strengths || [],
      improvements: out.improvements || [],
      technicalFeedback: out.technicalFeedback || [],
      recommendedTopics: await canonicalize(out.recommendedTopics || []),
      roundSummaries: out.roundSummaries || [],
      source: 'llm',
    };
  },

  /**
   * The showcase for Redis caching: generic topic explanations.
   * "Explain binary search" asked by 500 students = 1 LLM call, 499 cache hits.
   */
  async explainTopic(topic, style = 'concise interview-oriented language') {
    if (!isLLMConfigured()) {
      return {
        explanation: `${topic}: LLM not configured. Add OPENAI_API_KEY to enable AI topic explanations. Meanwhile, check the roadmap tasks related to ${topic}.`,
        cached: false,
        source: 'local',
      };
    }
    const key = cacheKeys.topicExplanation(topic, style);
    const { value, cached } = await cacheService.wrap(key, cacheService.ttls.topic, async () => {
      const p = prompts.topicExplanation(topic, style);
      return { explanation: await completeText(p.system, p.user) };
    });
    return { ...value, cached, source: 'llm' };
  },
};

function clamp(n, lo, hi) {
  const v = Number(n);
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(v * 10) / 10));
}

function validCategory(c) {
  const allowed = ['dsa', 'language', 'sql', 'backend', 'system-design', 'lld', 'project', 'aptitude', 'soft-skills', 'other'];
  return allowed.includes(c) ? c : 'other';
}

function normalizeQuestions(out) {
  return {
    questions: (out.questions || []).slice(0, 8).map((q) => ({
      text: String(q.text || '').slice(0, 1000),
      topic: q.topic || 'general',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    })).filter((q) => q.text),
  };
}

export { dedupeSkills };
