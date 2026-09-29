import { AIAnalysis, Job } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getQueue, QUEUES } from '../queue/queues.js';
import { getPagination, buildPageMeta } from '../utils/pagination.js';

export const analysisService = {
  /** The frontend polls this while a queued job runs. */
  async getStatus(analysisId, userId) {
    const analysis = await AIAnalysis.findOne({ _id: analysisId, user: userId })
      .select('type status error result createdAt startedAt completedAt attempts')
      .lean();
    if (!analysis) throw ApiError.notFound('Analysis not found');
    return analysis;
  },

  async listForUser(userId, query) {
    const { page, limit, skip } = getPagination(query, { defaultLimit: 10 });
    const filter = { user: userId };
    if (query.type) filter.type = query.type;
    const [items, total] = await Promise.all([
      AIAnalysis.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('type status createdAt completedAt error input').lean(),
      AIAnalysis.countDocuments(filter),
    ]);
    return { items, meta: buildPageMeta(total, page, limit) };
  },

  /** Latest completed analysis of a type — powers "show my last skill gap". */
  async latest(userId, type) {
    return AIAnalysis.findOne({ user: userId, type, status: 'completed' })
      .sort({ completedAt: -1 }).lean();
  },

  /** Enqueue a skill-gap analysis for a target job. Returns the polling handle. */
  async requestSkillGap(userId, jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw ApiError.notFound('Job not found');

    const analysis = await AIAnalysis.create({
      user: userId,
      type: 'skill-gap',
      status: 'queued',
      input: { job },
    });
    await getQueue(QUEUES.skillGap).add('analyze', {
      userId: String(userId), jobId: String(jobId), analysisId: String(analysis._id),
    });
    return { analysisId: analysis._id, status: 'queued' };
  },

  /** Enqueue roadmap generation (optionally targeting a job). */
  async requestRoadmap(userId, { jobId = null, weeksAvailable = 6 } = {}) {
    if (jobId && !(await Job.findById(jobId))) throw ApiError.notFound('Job not found');

    const analysis = await AIAnalysis.create({
      user: userId,
      type: 'roadmap',
      status: 'queued',
      input: jobId ? { job: jobId } : {},
    });
    await getQueue(QUEUES.roadmap).add('generate', {
      userId: String(userId), jobId: jobId ? String(jobId) : null,
      analysisId: String(analysis._id), weeksAvailable,
    });
    return { analysisId: analysis._id, status: 'queued' };
  },
};
