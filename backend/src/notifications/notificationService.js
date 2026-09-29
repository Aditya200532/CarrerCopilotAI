import { on, EVENTS } from '../events/bus.js';
import { getQueue, QUEUES } from '../queue/queues.js';

/**
 * Notification architecture:
 *   domain service --emit--> event bus --listener--> notifications queue --> worker --> channel strategy
 *
 * Services never wait on notification delivery, and delivery failures are
 * retried by BullMQ without affecting the operation that produced the event.
 */

function enqueueNotification(payload) {
  return getQueue(QUEUES.notifications).add('deliver', payload);
}

/** Sends a notification for a domain event. Called from bus listeners below AND directly by services. */
export function notify({ userId, type, channel = 'in-app', title, message, data, link }) {
  if (!userId || !title || !message) {
    console.warn('[notify] skipped incomplete notification', { type, userId });
    return Promise.resolve();
  }
  return enqueueNotification({ userId: String(userId), type, channel, title, message, data, link });
}

export function registerNotificationListeners() {
  on(EVENTS.ANALYSIS_COMPLETED, ({ userId, analysisType, analysisId, jobTitle }) => {
    const labels = {
      'resume-analysis': 'Resume analysis',
      'skill-gap': 'Skill gap analysis',
      roadmap: 'Preparation roadmap',
    };
    notify({
      userId,
      type: 'analysis-complete',
      title: `${labels[analysisType] || 'AI analysis'} is ready`,
      message: jobTitle
        ? `Your ${labels[analysisType] || 'analysis'} for "${jobTitle}" has completed.`
        : `Your ${labels[analysisType] || 'AI analysis'} has completed.`,
      data: { analysisId },
      link: analysisType === 'roadmap' ? '/roadmap' : '/resume-analyzer',
    });
  });

  on(EVENTS.ANALYSIS_FAILED, ({ userId, analysisType, analysisId, error }) => {
    notify({
      userId,
      type: 'analysis-failed',
      title: 'AI analysis failed',
      message: `Your ${analysisType} could not be completed: ${error || 'unknown error'}. It will be retried automatically if attempts remain.`,
      data: { analysisId },
      link: '/resume-analyzer',
    });
  });

  on(EVENTS.INTERVIEW_SCHEDULED, ({ userId, interviewId, targetRole }) => {
    notify({
      userId,
      type: 'interview-scheduled',
      title: 'Mock interview ready',
      message: `Your AI mock interview for "${targetRole}" is set up. Join when ready.`,
      data: { interviewId },
      link: `/mock-interview/${interviewId}`,
    });
  });

  on(EVENTS.INTERVIEW_REPORT_READY, ({ userId, interviewId, verdict }) => {
    notify({
      userId,
      type: 'interview-report-ready',
      title: 'Interview report generated',
      message: `Your mock interview report is ready. Overall verdict: ${verdict || 'n/a'}.`,
      data: { interviewId },
      link: `/interview-report/${interviewId}`,
    });
  });

  on(EVENTS.PLAN_GENERATED, ({ userId, planId, jobTitle }) => {
    notify({
      userId,
      type: 'plan-generated',
      title: 'Personalized roadmap generated',
      message: jobTitle
        ? `Your preparation roadmap targeting "${jobTitle}" is ready with prioritized tasks.`
        : 'Your preparation roadmap is ready with prioritized tasks.',
      data: { planId },
      link: '/roadmap',
    });
  });

  on(EVENTS.TASK_COMPLETED, ({ userId, taskId, planId, taskTitle }) => {
    notify({
      userId,
      type: 'task-completed',
      title: 'Task completed 🎯',
      message: `"${taskTitle}" marked complete. Keep the streak going!`,
      data: { taskId, planId },
      link: '/roadmap',
    });
  });
}
