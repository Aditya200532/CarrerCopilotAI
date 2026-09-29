import { Interview, InterviewQuestion, InterviewResponse, AIAnalysis, Resume } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, buildPageMeta } from '../utils/pagination.js';
import { getQueue, QUEUES } from '../queue/queues.js';
import { emit, EVENTS } from '../events/bus.js';
import { getStrategy } from '../interviews/strategies.js';
import { computeDsaWeakAreas } from './dsaService.js';

export const interviewService = {
  /** Create an interview session (REST). The live conversation runs over WebSocket. */
  async create(userId, { targetRole, rounds, settings }) {
    if (!rounds?.length) throw ApiError.badRequest('Select at least one interview round');
    for (const r of rounds) getStrategy(r); // validates round names via the strategy registry

    const interview = await Interview.create({
      user: userId,
      targetRole,
      rounds: rounds.map((type) => ({ type })),
      settings: settings || {},
    });

    emit(EVENTS.INTERVIEW_SCHEDULED, {
      userId, interviewId: String(interview._id), targetRole,
    });
    return interview;
  },

  async list(userId, query) {
    const { page, limit, skip } = getPagination(query, { defaultLimit: 10 });
    const [items, total] = await Promise.all([
      Interview.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .select('targetRole rounds status startedAt completedAt report.overallRating report.verdict')
        .lean(),
      Interview.countDocuments({ user: userId }),
    ]);
    return { items, meta: buildPageMeta(total, page, limit) };
  },

  async getOwned(interviewId, userId) {
    const interview = await Interview.findOne({ _id: interviewId, user: userId });
    if (!interview) throw ApiError.notFound('Interview not found');
    return interview;
  },

  /** Full detail view for the report page: report + transcript. */
  async getReport(interviewId, userId) {
    const interview = await this.getOwned(interviewId, userId);
    const questions = await InterviewQuestion.find({ interview: interviewId }).sort({ askedAt: 1 }).lean();
    const responses = await InterviewResponse.find({ interview: interviewId }).lean();
    const byQuestion = new Map(responses.map((r) => [String(r.question), r]));
    const transcript = questions.map((q) => ({
      ...q,
      answer: byQuestion.get(String(q._id))?.text || null,
    }));
    return { interview, transcript };
  },

  /** Context passed into strategies when generating questions. */
  async buildContext(interview) {
    const resume = await Resume.findOne({ user: interview.user, isPrimary: true }).lean();
    const latestAnalysis = await AIAnalysis.findOne({
      user: interview.user, type: 'resume-analysis', status: 'completed',
    }).sort({ completedAt: -1 }).lean();

    return {
      role: interview.targetRole,
      count: interview.settings.maxQuestionsPerRound || 3,
      difficulty: interview.settings.difficulty === 'mixed' ? 'medium' : interview.settings.difficulty,
      resumeContext: latestAnalysis?.result
        ? `Skills: ${(latestAnalysis.result.skills || []).join(', ')}. Strengths: ${(latestAnalysis.result.strengths || []).join('; ')}`
        : resume?.extractedText?.slice(0, 2500),
      dsaWeakAreas: await computeDsaWeakAreas(interview.user),
    };
  },

  async recordQuestion(interviewId, { round, kind, parent, text, topic, difficulty, fromCache }) {
    return InterviewQuestion.create({ interview: interviewId, round, kind, parent, text, topic, difficulty, fromCache });
  },

  async recordResponse(interview, questionId, userId, text) {
    const q = await InterviewQuestion.findById(questionId);
    if (!q || String(q.interview) !== String(interview._id)) {
      throw ApiError.badRequest('Question does not belong to this interview');
    }
    return InterviewResponse.create({ interview: interview._id, question: questionId, user: userId, text });
  },

  async askedTexts(interviewId, round) {
    const qs = await InterviewQuestion.find({ interview: interviewId, round }).select('text').lean();
    return qs.map((q) => q.text);
  },

  /** Mark a round complete; when all rounds are done, enqueue the AI report. */
  async completeRound(interview, round) {
    const r = interview.rounds.find((x) => x.type === round);
    if (r) { r.status = 'completed'; r.completedAt = new Date(); }
    await interview.save();

    const allDone = interview.rounds.every((x) => x.status === 'completed');
    if (allDone) {
      interview.status = 'completed';
      interview.completedAt = new Date();
      await interview.save();
      await this.enqueueReport(interview);
    }
    return allDone;
  },

  async enqueueReport(interview) {
    const analysis = await AIAnalysis.create({
      user: interview.user,
      type: 'interview-report',
      status: 'queued',
      input: { interview: interview._id },
    });
    await Interview.updateOne({ _id: interview._id }, { reportAnalysis: analysis._id });
    await getQueue(QUEUES.interviewReport).add('report', {
      userId: String(interview.user),
      interviewId: String(interview._id),
      analysisId: String(analysis._id),
    });
    return analysis._id;
  },

  async abandon(interviewId, userId) {
    const interview = await this.getOwned(interviewId, userId);
    if (interview.status === 'completed') throw ApiError.badRequest('Interview already completed');
    interview.status = 'abandoned';
    await interview.save();
    return interview;
  },
};
