import { aiService } from '../ai/aiService.js';

/**
 * LLD — Strategy pattern for interview rounds.
 *
 * InterviewStrategy is the common interface; each round type implements its
 * own question-generation and evaluation-focus logic. The live interview
 * engine depends only on the interface, so adding a new round type (e.g.
 * "Aptitude") is one class + one registry entry — no engine changes (OCP).
 */
export class InterviewStrategy {
  get round() { throw new Error('Not implemented'); }
  get label() { throw new Error('Not implemented'); }

  /** @returns {{questions: Array<{text, topic, difficulty}>}} */
  async generateQuestions(_ctx) { throw new Error('Not implemented'); }

  async generateFollowUp(ctx) {
    const out = await aiService.getFollowUp({
      question: ctx.questionText, answer: ctx.answerText, round: this.round,
    });
    return out;
  }

  /** What the reporter should weigh for this round. */
  evaluationFocus() { return []; }
}

export class ResumeInterview extends InterviewStrategy {
  get round() { return 'resume'; }
  get label() { return 'Resume Deep-Dive'; }
  async generateQuestions(ctx) {
    return aiService.getInterviewQuestions({
      round: this.round, role: ctx.role, count: ctx.count, difficulty: ctx.difficulty,
      resumeContext: ctx.resumeContext, askedBefore: ctx.askedBefore,
    });
  }
  evaluationFocus() { return ['ownership of projects', 'clarity on tech choices', 'honesty about contributions']; }
}

export class JavaOopInterview extends InterviewStrategy {
  get round() { return 'oop-java'; }
  get label() { return 'Java / OOP'; }
  async generateQuestions(ctx) {
    return aiService.getInterviewQuestions({ round: this.round, role: ctx.role, count: ctx.count, difficulty: ctx.difficulty, askedBefore: ctx.askedBefore });
  }
  evaluationFocus() { return ['SOLID understanding', 'collections internals', 'concrete Java examples']; }
}

export class DsaInterview extends InterviewStrategy {
  get round() { return 'dsa'; }
  get label() { return 'DSA'; }
  async generateQuestions(ctx) {
    // Bias questions toward the candidate's weak topics when known.
    const weak = ctx.dsaWeakAreas || [];
    const resumeContext = weak.length ? `Prefer questions on these weak topics: ${weak.join(', ')}` : undefined;
    return aiService.getInterviewQuestions({ round: this.round, role: ctx.role, count: ctx.count, difficulty: ctx.difficulty, askedBefore: ctx.askedBefore, ...(weak.length ? {} : { resumeContext }) });
  }
  evaluationFocus() { return ['approach before code', 'complexity analysis', 'edge cases']; }
}

export class SqlInterview extends InterviewStrategy {
  get round() { return 'sql'; }
  get label() { return 'SQL / Databases'; }
  async generateQuestions(ctx) {
    return aiService.getInterviewQuestions({ round: this.round, role: ctx.role, count: ctx.count, difficulty: ctx.difficulty, askedBefore: ctx.askedBefore });
  }
  evaluationFocus() { return ['joins & aggregation fluency', 'indexing awareness', 'normalization reasoning']; }
}

export class BackendInterview extends InterviewStrategy {
  get round() { return 'backend'; }
  get label() { return 'Backend Engineering'; }
  async generateQuestions(ctx) {
    return aiService.getInterviewQuestions({ round: this.round, role: ctx.role, count: ctx.count, difficulty: ctx.difficulty, askedBefore: ctx.askedBefore });
  }
  evaluationFocus() { return ['HTTP/REST fundamentals', 'auth & caching', 'debugging methodology']; }
}

export class LldInterview extends InterviewStrategy {
  get round() { return 'lld'; }
  get label() { return 'Low-Level Design'; }
  async generateQuestions(ctx) {
    return aiService.getInterviewQuestions({ round: this.round, role: ctx.role, count: ctx.count, difficulty: ctx.difficulty, askedBefore: ctx.askedBefore });
  }
  evaluationFocus() { return ['class/responsibility identification', 'pattern selection with justification', 'SOLID application']; }
}

export class SystemDesignInterview extends InterviewStrategy {
  get round() { return 'system-design'; }
  get label() { return 'System Design'; }
  async generateQuestions(ctx) {
    return aiService.getInterviewQuestions({ round: this.round, role: ctx.role, count: ctx.count, difficulty: ctx.difficulty, askedBefore: ctx.askedBefore });
  }
  evaluationFocus() { return ['requirements clarification', 'component tradeoffs', 'scaling reasoning']; }
}

const strategies = [
  new ResumeInterview(),
  new JavaOopInterview(),
  new DsaInterview(),
  new SqlInterview(),
  new BackendInterview(),
  new LldInterview(),
  new SystemDesignInterview(),
];

const registry = new Map(strategies.map((s) => [s.round, s]));

export function getStrategy(round) {
  const s = registry.get(round);
  if (!s) throw new Error(`No interview strategy for round: ${round}`);
  return s;
}

export function allStrategies() {
  return strategies;
}
