import mongoose from 'mongoose';
import { PreparationTask, DSAProblem, Interview, AIAnalysis, Resume, Job, Notification } from '../models/index.js';
import { StudentProfile } from '../models/index.js';
import { planService } from './planService.js';
import { dsaService } from './dsaService.js';
import { analysisService } from './analysisService.js';

/** Aggregates everything the dashboard shows in one round-trip per section. */
export const dashboardService = {
  async getStats(userId) {
    const [profile, activePlan, upcomingTasks, dsaTotals, recentInterviews, latestResumeAnalysis, unreadNotifications, savedJobs] =
      await Promise.all([
        StudentProfile.findOne({ user: userId }).lean(),
        planService.getActivePlan(userId),
        PreparationTask.find({ user: userId, status: { $in: ['pending', 'in_progress'] } })
          .sort({ dueDate: 1, order: 1 }).limit(5).lean(),
        DSAProblem.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: null, logged: { $sum: 1 }, solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } } } },
        ]),
        Interview.find({ user: userId }).sort({ createdAt: -1 }).limit(3)
          .select('targetRole status createdAt report.overallRating report.verdict').lean(),
        analysisService.latest(userId, 'resume-analysis'),
        Notification.countDocuments({ user: userId, read: false }),
        Job.countDocuments({ postedBy: userId, status: 'active' }),
      ]);

    const weakAreas = (await dsaService.getStats(userId)).weakAreas.slice(0, 3);

    return {
      profileComplete: computeProfileCompleteness(profile),
      targetRoles: profile?.targetRoles || [],
      plan: activePlan
        ? { id: activePlan.plan._id, title: activePlan.plan.title, progress: activePlan.progress }
        : null,
      upcomingTasks,
      dsa: {
        logged: dsaTotals[0]?.logged || 0,
        solved: dsaTotals[0]?.solved || 0,
        weakAreas,
      },
      recentInterviews,
      resume: {
        analyzed: Boolean(latestResumeAnalysis),
        readinessScore: latestResumeAnalysis?.result?.readinessScore ?? null,
        analyzedAt: latestResumeAnalysis?.completedAt || null,
      },
      unreadNotifications,
      savedJobs,
    };
  },
};

function computeProfileCompleteness(profile) {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.headline),
    Boolean(profile.graduationYear),
    (profile.education || []).length > 0,
    (profile.targetRoles || []).length > 0,
    (profile.programmingLanguages || []).length > 0,
    (profile.frameworks || []).length > 0 || (profile.databases || []).length > 0,
    (profile.projects || []).length > 0,
    Boolean(profile.links?.github || profile.links?.linkedin),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
