import crypto from 'node:crypto';
import { Job, StudentProfile, AIAnalysis } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, buildPageMeta } from '../utils/pagination.js';
import { compareSkillSets, normalizeSkillName } from '../utils/skills.js';
import { getQueue, QUEUES } from '../queue/queues.js';

export const jobService = {
  /** Paginated listing with text search + structured filters. Backed by the text index on Job. */
  async list(query, userId) {
    const { page, limit, skip } = getPagination(query, { defaultLimit: 12 });
    const filter = { status: 'active' };

    if (query.search) filter.$text = { $search: query.search };
    if (query.type) filter.type = query.type;
    if (query.role) filter.role = normalizeSkillName(query.role);
    if (query.experienceLevel) filter.experienceLevel = query.experienceLevel;
    if (query.skill) filter.requiredSkills = normalizeSkillName(query.skill);
    if (query.mine === 'true') filter.postedBy = userId;

    const sortBy = { posted: { createdAt: -1 }, title: { title: 1 }, match: null }[query.sortBy] || { createdAt: -1 };
    if (query.search && sortBy.createdAt) sortBy.score = { $meta: 'textScore' };

    const projection = query.search && sortBy.score ? { score: { $meta: 'textScore' } } : {};

    const [items, total] = await Promise.all([
      Job.find(filter, projection).sort(sortBy).skip(skip).limit(limit).select('-description').lean(),
      Job.countDocuments(filter),
    ]);
    return { items, meta: buildPageMeta(total, page, limit) };
  },

  async getById(id, userId) {
    const job = await Job.findById(id);
    if (!job || (job.status !== 'active' && String(job.postedBy) !== String(userId))) {
      throw ApiError.notFound('Job not found');
    }
    return job;
  },

  /** Create from pasted JD; AI skill extraction runs async via queue. */
  async create(data, userId) {
    const descriptionHash = crypto.createHash('sha256').update(data.description).digest('hex');
    const job = await Job.create({
      ...data,
      descriptionHash,
      postedBy: userId,
      role: data.role ? normalizeSkillName(data.role) : undefined,
      requiredSkills: (data.requiredSkills || []).map(normalizeSkillName),
      niceToHaveSkills: (data.niceToHaveSkills || []).map(normalizeSkillName),
    });

    if (!job.requiredSkills.length) {
      await getQueue(QUEUES.jobExtraction).add('extract', { jobId: String(job._id) }, { jobId: `extract-${descriptionHash.slice(0, 16)}` });
    }
    return job;
  },

  async archive(id, userId) {
    const job = await Job.findOneAndUpdate({ _id: id, postedBy: userId }, { status: 'archived' }, { new: true });
    if (!job) throw ApiError.notFound('Job not found');
    return job;
  },

  /**
   * Transparent skill match: deterministic set comparison of the student's
   * skills vs the job's requirements. No AI score — every row is explainable.
   */
  async match(id, userId) {
    const job = await this.getById(id, userId);
    const profile = await StudentProfile.findOne({ user: userId });
    const studentSkills = profile ? profile.allSkillNames() : [];

    // Include skills from the latest completed resume analysis, if any.
    const latest = await AIAnalysis.findOne({ user: userId, type: 'resume-analysis', status: 'completed' })
      .sort({ completedAt: -1 }).lean();
    if (latest?.result?.skills) studentSkills.push(...latest.result.skills);

    const comparison = compareSkillSets(studentSkills, job.requiredSkills, job.niceToHaveSkills);
    return { job: { id: job._id, title: job.title, company: job.company, role: job.role }, comparison };
  },
};
