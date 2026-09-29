import mongoose from 'mongoose';
import { DSAProblem, DSA_TOPICS } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, buildPageMeta } from '../utils/pagination.js';

/**
 * DSA progress tracking. The platform does NOT judge code — students log
 * problems they solved elsewhere; we aggregate per-topic stats to locate weak
 * areas deterministically (no AI needed for arithmetic).
 */

const MIN_ATTEMPTS_TO_RATE = 2;

export async function computeDsaWeakAreas(userId) {
  const stats = await getTopicStats(userId);
  return stats
    .filter((t) => t.attempted + t.solved > 0 && t.score < 55)
    .sort((a, b) => a.score - b.score)
    .map((t) => t.topic);
}

export async function getTopicStats(userId) {
  const rows = await DSAProblem.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$topic',
        solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
        attempted: { $sum: { $cond: [{ $ne: ['$status', 'solved'] }, 1, 0] } },
        revisit: { $sum: { $cond: [{ $eq: ['$status', 'revisit'] }, 1, 0] } },
        easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
        hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
        avgAttempts: { $avg: '$attempts' },
      },
    },
  ]);

  const byTopic = new Map(rows.map((r) => [r._id, r]));
  return DSA_TOPICS.map((topic) => {
    const r = byTopic.get(topic) || { solved: 0, attempted: 0, revisit: 0, easy: 0, medium: 0, hard: 0, avgAttempts: 0 };
    const total = r.solved + r.attempted;
    // Simple, explainable topic score:
    //  solved ratio weighted by difficulty, penalized by revisits & many attempts.
    let score = 0;
    if (total > 0) {
      const solveRatio = r.solved / total;
      const difficultyBonus = (r.medium * 0.2 + r.hard * 0.35) / Math.max(total, 1);
      const attemptPenalty = Math.max(0, (r.avgAttempts - 2) * 0.05);
      const revisitPenalty = (r.revisit / total) * 0.2;
      score = Math.round(Math.min(100, Math.max(0, (solveRatio + difficultyBonus - attemptPenalty - revisitPenalty) * 100)));
    }
    const confidence = total >= MIN_ATTEMPTS_TO_RATE ? 'measured' : total > 0 ? 'low-data' : 'no-data';
    return { topic, ...r, total, score, confidence };
  });
}

export const dsaService = {
  async listProblems(userId, query) {
    const { page, limit, skip } = getPagination(query, { defaultLimit: 20 });
    const filter = { user: userId };
    if (query.topic) filter.topic = query.topic;
    if (query.difficulty) filter.difficulty = query.difficulty;
    if (query.status) filter.status = query.status;
    if (query.platform) filter.platform = query.platform;

    const [items, total] = await Promise.all([
      DSAProblem.find(filter).sort({ solvedAt: -1 }).skip(skip).limit(limit).lean(),
      DSAProblem.countDocuments(filter),
    ]);
    return { items, meta: buildPageMeta(total, page, limit) };
  },

  async addProblem(userId, data) {
    try {
      return await DSAProblem.create({ ...data, user: userId });
    } catch (err) {
      if (err.code === 11000) {
        throw ApiError.conflict('This problem is already logged (same title + platform)');
      }
      throw err;
    }
  },

  async updateProblem(userId, id, data) {
    const problem = await DSAProblem.findOneAndUpdate({ _id: id, user: userId }, data, { new: true, runValidators: true });
    if (!problem) throw ApiError.notFound('Problem not found');
    return problem;
  },

  async deleteProblem(userId, id) {
    const res = await DSAProblem.deleteOne({ _id: id, user: userId });
    if (res.deletedCount === 0) throw ApiError.notFound('Problem not found');
  },

  async getStats(userId) {
    const topicStats = await getTopicStats(userId);
    const totals = await DSAProblem.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          logged: { $sum: 1 },
          solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
          easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
          hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
        },
      },
    ]);
    const t = totals[0] || { logged: 0, solved: 0, easy: 0, medium: 0, hard: 0 };

    const measured = topicStats.filter((s) => s.confidence === 'measured');
    const weakAreas = measured.filter((s) => s.score < 55).sort((a, b) => a.score - b.score);
    const strongAreas = measured.filter((s) => s.score >= 75).sort((a, b) => b.score - a.score);
    // Topics with zero activity are "unexplored" — also candidates for the plan.
    const untouched = topicStats.filter((s) => s.total === 0).map((s) => s.topic);

    return {
      totals: t,
      topics: topicStats,
      weakAreas: weakAreas.map((s) => ({ topic: s.topic, score: s.score, total: s.total })),
      strongAreas: strongAreas.map((s) => ({ topic: s.topic, score: s.score })),
      untouched,
      recommendations: buildRecommendations(weakAreas, untouched),
    };
  },
};

function buildRecommendations(weak, untouched) {
  const recs = [];
  for (const w of weak.slice(0, 3)) {
    recs.push({ topic: w.topic, reason: `Low topic score (${w.score}/100) across ${w.total} logged problems`, action: 'Revisit fundamentals, then solve 8-10 fresh problems without looking at solutions first.' });
  }
  // Prioritize interview-critical untouched topics first.
  const critical = ['arrays', 'strings', 'hashing', 'binary-search', 'linked-lists', 'trees', 'graphs', 'dynamic-programming'];
  for (const topic of untouched.filter((t) => critical.includes(t)).slice(0, 3)) {
    recs.push({ topic, reason: 'No problems logged yet — commonly asked in placement rounds', action: 'Start with 5 easy problems to build a baseline.' });
  }
  return recs;
}
