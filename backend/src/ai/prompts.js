/**
 * All LLM prompts live in one module — versioned, reviewable, testable.
 * Prompts are part of the system design: the AI service is the only place
 * that knows how to talk to the model.
 */

export const PROMPT_VERSION = 'v1';

export const prompts = {
  jobSkillExtraction: (description) => ({
    system:
      'You are a technical recruiter AI. Extract structured hiring data from job descriptions. ' +
      'Respond ONLY with JSON matching this schema: ' +
      '{"role": string, "requiredSkills": string[], "niceToHaveSkills": string[], "responsibilities": string[], "experienceLevel": "fresher"|"intern"|"junior"|"mid"|"any"}. ' +
      'Skills must be lowercase canonical technology names (e.g. "react", "mongodb", "spring boot"), max 20 required and 10 nice-to-have.',
    user: `JOB DESCRIPTION:\n"""\n${description.slice(0, 12000)}\n"""`,
  }),

  resumeAnalysis: (resumeText, profileSummary) => ({
    system:
      'You are an expert placement coach analyzing a student resume for campus placements. ' +
      'Respond ONLY with JSON: {"skills": string[], "strengths": string[], "weaknesses": string[], ' +
      '"missingEssentials": string[], "projectFeedback": string, "resumeTips": string[], "readinessScore": number 0-10, ' +
      '"suitableRoles": string[]}. Skills lowercase canonical names. Be specific and honest — this feeds a real preparation plan.',
    user:
      `STUDENT PROFILE SUMMARY:\n${profileSummary || 'Not provided'}\n\n` +
      `RESUME TEXT:\n"""\n${resumeText.slice(0, 15000)}\n"""`,
  }),

  skillGapAdvice: ({ matched, missing, role, dsaSummary }) => ({
    system:
      'You are a placement preparation strategist. Given a transparent skill comparison between a student and a target job, ' +
      'produce prioritized guidance. Respond ONLY with JSON: {"overallAssessment": string, ' +
      '"priorityOrder": string[] (skill names from the missing list, most critical first), ' +
      '"reasoning": [{"skill": string, "why": string}], "quickWins": string[]}.',
    user:
      `TARGET ROLE: ${role}\n` +
      `MATCHED SKILLS: ${matched.join(', ') || 'none'}\n` +
      `MISSING SKILLS: ${missing.join(', ') || 'none'}\n` +
      `DSA STATUS: ${dsaSummary || 'no data'}`,
  }),

  roadmap: ({ role, missing, matched, dsaWeakAreas, weeksAvailable }) => ({
    system:
      'You are a placement preparation planner for final-year CS/IT students. Create a realistic, week-by-week roadmap. ' +
      'Respond ONLY with JSON: {"title": string, "overview": string, "targetDate": "YYYY-MM-DD", ' +
      '"tasks": [{"title": string, "description": string, "category": "dsa"|"language"|"sql"|"backend"|"system-design"|"lld"|"project"|"aptitude"|"soft-skills"|"other", ' +
      '"topic": string, "priority": "high"|"medium"|"low", "estimatedHours": number, "order": number, "weekNumber": number}]}. ' +
      'Include DSA practice tied to weak topics, the missing job skills, and interview-prep tasks. 20-40 tasks total. Order must be sequential.',
    user:
      `TARGET ROLE: ${role}\nWEEKS AVAILABLE: ${weeksAvailable}\n` +
      `SKILLS ALREADY HAVE: ${matched.join(', ') || 'none'}\n` +
      `SKILLS TO LEARN: ${missing.join(', ') || 'none'}\n` +
      `DSA WEAK AREAS: ${dsaWeakAreas.join(', ') || 'unknown'}`,
  }),

  interviewQuestions: ({ round, role, count, difficulty, resumeContext, askedBefore }) => ({
    system:
      `You are an experienced technical interviewer conducting the "${round}" round for a "${role}" campus placement. ` +
      'Respond ONLY with JSON: {"questions": [{"text": string, "topic": string, "difficulty": "easy"|"medium"|"hard"}]}. ' +
      `Generate exactly ${count} questions.`,
    user:
      `DIFFICULTY: ${difficulty}\n` +
      (resumeContext ? `CANDIDATE CONTEXT:\n${resumeContext.slice(0, 3000)}\n` : '') +
      (askedBefore?.length ? `DO NOT REPEAT THESE: ${askedBefore.join(' | ')}\n` : '') +
      'Generate the questions now.',
  }),

  followUp: ({ question, answer, round }) => ({
    system:
      `You are a technical interviewer in a "${round}" round. Based on the candidate's answer, ask ONE sharp follow-up ` +
      'that probes depth, edge cases, or a claim they made. Respond ONLY with JSON: {"text": string, "topic": string}.',
    user: `QUESTION: ${question}\nCANDIDATE ANSWER: ${String(answer).slice(0, 2000)}`,
  }),

  interviewReport: ({ role, transcript }) => ({
    system:
      'You are a hiring manager writing a mock-interview debrief for a student. Be specific, kind, and rigorous. ' +
      'Respond ONLY with JSON: {"overallRating": number 1-10, "verdict": "not-ready"|"needs-practice"|"ready"|"strong", ' +
      '"strengths": string[], "improvements": string[], "technicalFeedback": string[], "recommendedTopics": string[], ' +
      '"roundSummaries": [{"round": string, "rating": number 1-10, "summary": string}]}.',
    user: `TARGET ROLE: ${role}\n\nFULL TRANSCRIPT (Q/A pairs):\n${transcript.slice(0, 24000)}`,
  }),

  topicExplanation: (topic, style) => ({
    system: `You are a CS tutor for placement preparation. Explain in ${style}. Use short paragraphs, one compact example, and complexity notes where relevant. Plain text, max 400 words.`,
    user: `Topic: ${topic}`,
  }),
};
