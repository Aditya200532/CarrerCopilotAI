import { Skill } from '../models/index.js';
import { normalizeSkillName, dedupeSkills } from '../utils/skills.js';

/**
 * Deterministic, no-LLM fallbacks.
 *
 * Why they exist:
 *  1. Development/demo without an API key — the whole product stays functional.
 *  2. A baseline for extraction quality checks during viva demos.
 * They are simple by design: keyword matching against the canonical Skill catalog.
 */

/** Extracts catalog skills mentioned in a text (word-boundary match on names+aliases). */
export async function localSkillExtraction(text) {
  const skills = await Skill.find({}, { name: 1, aliases: 1 }).lean();
  const lower = ` ${normalizeSkillName(text).replace(/[^a-z0-9+#.\s]/g, ' ')} `;
  const found = new Set();

  for (const s of skills) {
    const variants = [s.name, ...s.aliases];
    for (const v of variants) {
      const needle = normalizeSkillName(v);
      if (!needle) continue;
      // word-boundary-ish match; handles "c++", "node.js" etc.
      const re = new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
      if (re.test(lower)) {
        found.add(s.name);
        break;
      }
    }
  }
  return dedupeSkills([...found]);
}

export function localResumeAnalysis(resumeText) {
  const skills = [];
  const lines = resumeText.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    skills, // filled by caller via localSkillExtraction
    strengths: ['Resume parsed successfully with local analyzer (configure OPENAI_API_KEY for AI-grade insights)'],
    weaknesses: ['AI-based resume critique unavailable without an LLM key'],
    missingEssentials: [],
    projectFeedback: `Found ${lines.length} non-empty lines of content.`,
    resumeTips: [
      'Quantify project impact with numbers (users, latency, accuracy).',
      'List technologies explicitly — parsers and recruiters both scan for keywords.',
      'Keep the resume to one page for campus placements.',
    ],
    readinessScore: 5,
    suitableRoles: ['software engineer'],
  };
}

export function localRoadmap({ role, missing, dsaWeakAreas }) {
  const tasks = [];
  let order = 0;
  const push = (t) => tasks.push({ ...t, order: order++ });

  for (const topic of dsaWeakAreas.slice(0, 4)) {
    push({
      title: `DSA focus: ${topic}`,
      description: `Solve 10-15 problems on ${topic}, starting easy and progressing to medium. Track them in DSA Progress.`,
      category: 'dsa',
      topic,
      priority: 'high',
      estimatedHours: 12,
    });
  }
  for (const skill of missing.slice(0, 6)) {
    push({
      title: `Learn ${skill}`,
      description: `Build a small hands-on exercise with ${skill} and be able to explain it in an interview for the ${role} role.`,
      category: guessCategory(skill),
      topic: skill,
      priority: 'high',
      estimatedHours: 10,
    });
  }
  push({
    title: 'SQL fundamentals drill',
    description: 'Joins, GROUP BY, subqueries, indexes. Practice 20 queries on a sample database.',
    category: 'sql', topic: 'sql', priority: 'medium', estimatedHours: 8,
  });
  push({
    title: 'Mock interview practice',
    description: 'Complete at least 2 full AI mock interviews for this role and act on the feedback.',
    category: 'soft-skills', topic: 'interview-practice', priority: 'medium', estimatedHours: 4,
  });

  return {
    title: `Preparation roadmap — ${role}`,
    overview: `Locally generated plan covering ${missing.length} missing skills and ${dsaWeakAreas.length} weak DSA areas. Regenerate with an LLM key for a week-by-week personalized plan.`,
    targetDate: new Date(Date.now() + 42 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    tasks,
  };
}

export const LOCAL_QUESTION_BANK = {
  resume: [
    { text: 'Walk me through the project you are most proud of. What was your specific contribution?', topic: 'projects', difficulty: 'easy' },
    { text: 'What was the hardest technical decision in your resume projects, and what tradeoffs did you consider?', topic: 'projects', difficulty: 'medium' },
    { text: 'You listed this technology on your resume — explain a concrete situation where you used it beyond a tutorial.', topic: 'resume-depth', difficulty: 'medium' },
  ],
  'oop-java': [
    { text: 'Explain the four pillars of OOP with a real example from your projects.', topic: 'oop', difficulty: 'easy' },
    { text: 'What is the difference between an abstract class and an interface? When would you use each?', topic: 'oop', difficulty: 'medium' },
    { text: 'How does polymorphism work internally in Java? Explain method overriding vs overloading resolution.', topic: 'java', difficulty: 'medium' },
    { text: 'Explain the SOLID principles. Pick one and describe how you applied it in a project.', topic: 'solid', difficulty: 'hard' },
    { text: 'What are Java collections framework internals — how does HashMap work, and what changed in Java 8?', topic: 'java-collections', difficulty: 'hard' },
  ],
  dsa: [
    { text: 'Given a sorted array, how would you find the first occurrence of a target? Walk through the approach and complexity.', topic: 'binary-search', difficulty: 'easy' },
    { text: 'How would you detect a cycle in a linked list? Prove why the approach works.', topic: 'linked-lists', difficulty: 'medium' },
    { text: 'Explain BFS vs DFS. When is each preferable, and what are their space complexities?', topic: 'graphs', difficulty: 'medium' },
    { text: 'Describe how you would approach a dynamic programming problem. Take "longest common subsequence" as an example.', topic: 'dynamic-programming', difficulty: 'hard' },
    { text: 'You need the k largest elements from a stream of data. Which data structure do you use and why?', topic: 'heaps', difficulty: 'medium' },
  ],
  sql: [
    { text: 'What is the difference between INNER JOIN and LEFT JOIN? Give a placement-relevant example with two tables.', topic: 'joins', difficulty: 'easy' },
    { text: 'Write a query approach to find the second highest salary in an Employee table. Handle duplicates.', topic: 'queries', difficulty: 'medium' },
    { text: 'What is an index? When does adding an index hurt performance?', topic: 'indexing', difficulty: 'medium' },
    { text: 'Explain GROUP BY with HAVING. How is HAVING different from WHERE?', topic: 'aggregation', difficulty: 'easy' },
    { text: 'What is normalization? Explain 1NF, 2NF and 3NF with an example of a denormalized table you would fix.', topic: 'normalization', difficulty: 'hard' },
  ],
  backend: [
    { text: 'Explain what happens from the moment a browser sends an HTTP request to when it receives a response.', topic: 'http', difficulty: 'easy' },
    { text: 'What is REST? Explain the constraints and why statelessness matters.', topic: 'rest', difficulty: 'medium' },
    { text: 'How does JWT authentication work? Where should tokens be stored on the client and why?', topic: 'auth', difficulty: 'medium' },
    { text: 'Your API is slow. Walk me through how you would diagnose the bottleneck.', topic: 'performance', difficulty: 'hard' },
    { text: 'What is the role of a cache like Redis in a backend? Explain cache-aside and TTL choices.', topic: 'caching', difficulty: 'medium' },
  ],
  lld: [
    { text: 'Design a parking lot system. Identify the classes, their responsibilities, and key relationships.', topic: 'lld', difficulty: 'medium' },
    { text: 'Which design pattern would you use for a notification system supporting email, SMS and push? Sketch the classes.', topic: 'strategy-pattern', difficulty: 'medium' },
    { text: 'Explain the Single Responsibility Principle with an example of a class that violates it and the refactor.', topic: 'solid', difficulty: 'easy' },
    { text: 'Design a library management system. Focus on the book-lending state transitions.', topic: 'lld', difficulty: 'hard' },
  ],
  'system-design': [
    { text: 'Design a URL shortener. Cover API, storage choice, and how you would handle high read traffic.', topic: 'system-design', difficulty: 'medium' },
    { text: 'What is horizontal vs vertical scaling? When does each make sense for a student project going to production?', topic: 'scaling', difficulty: 'easy' },
    { text: 'Design a notification service that must not block the main application. What components would you use?', topic: 'queues', difficulty: 'medium' },
    { text: 'How would you design rate limiting for a public API? Compare fixed window vs sliding window.', topic: 'rate-limiting', difficulty: 'hard' },
    { text: 'Explain CAP theorem with an example decision you would face choosing MongoDB vs Redis persistence.', topic: 'cap', difficulty: 'hard' },
  ],
};

function pickQuestions(round, count) {
  const bank = LOCAL_QUESTION_BANK[round] || LOCAL_QUESTION_BANK.dsa;
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, bank.length));
}

export function localInterviewQuestions({ round, count }) {
  return { questions: pickQuestions(round, count) };
}

export function localFollowUp({ question, round }) {
  return {
    text: `Good. Now go one level deeper on that — what edge cases or failure scenarios would change your answer to "${question.slice(0, 60)}..."?`,
    topic: round,
  };
}

export function localInterviewReport({ role, qaCount }) {
  return {
    overallRating: Math.min(10, 4 + Math.round(qaCount / 2)),
    verdict: qaCount >= 8 ? 'needs-practice' : 'not-ready',
    strengths: ['Willingness to attempt all questions', 'Communicated answers in complete sentences'],
    improvements: [
      'Add concrete examples from your projects to support claims',
      'Discuss time/space complexity unprompted in DSA answers',
      'Structure answers: approach → tradeoffs → edge cases',
    ],
    technicalFeedback: [
      `This report was generated by the local fallback analyzer (LLM key not configured). Answers were recorded but not deeply evaluated.`,
    ],
    recommendedTopics: ['system design basics', 'OOP deep dive', 'SQL joins and indexing'],
    roundSummaries: [{ round: role, rating: 5, summary: 'Local fallback evaluation — configure an LLM key for detailed per-round feedback.' }],
  };
}

function guessCategory(skill) {
  const s = normalizeSkillName(skill);
  if (['mysql', 'postgresql', 'mongodb', 'sql', 'redis', 'oracle'].includes(s)) return 'sql';
  if (['express', 'spring boot', 'django', 'flask', 'node.js'].includes(s)) return 'backend';
  if (['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'nginx'].includes(s)) return 'other';
  return 'language';
}
