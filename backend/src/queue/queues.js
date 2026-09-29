import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

/**
 * BullMQ queues — the "which task should be processed asynchronously?" side
 * of Redis. (The cache side lives in cacheService.)
 *
 * Why queues instead of calling the LLM inline in the request handler?
 *  - Resume analysis / roadmap generation take 5–30s; HTTP requests shouldn't block that long.
 *  - Workers retry failed LLM calls with backoff — transient API errors don't lose user work.
 *  - Concurrency is capped at the worker, giving a natural buffer against LLM rate limits.
 *
 * The API enqueues a job and returns an AIAnalysis id immediately; the
 * frontend polls /api/analysis/:id (or receives a notification) for the result.
 */

const defaultJobOptions = {
  removeOnComplete: { age: 24 * 3600 },
  removeOnFail: { age: 7 * 24 * 3600 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
};

export const QUEUES = {
  resumeAnalysis: 'resume-analysis',
  skillGap: 'skill-gap',
  roadmap: 'roadmap',
  jobExtraction: 'job-extraction',
  interviewReport: 'interview-report',
  notifications: 'notifications',
};

function makeQueue(name, overrides = {}) {
  return new Queue(name, {
    connection: redis,
    defaultJobOptions: { ...defaultJobOptions, ...overrides },
  });
}

export const queues = {
  [QUEUES.resumeAnalysis]: makeQueue(QUEUES.resumeAnalysis),
  [QUEUES.skillGap]: makeQueue(QUEUES.skillGap),
  [QUEUES.roadmap]: makeQueue(QUEUES.roadmap),
  [QUEUES.jobExtraction]: makeQueue(QUEUES.jobExtraction, { attempts: 2 }),
  [QUEUES.interviewReport]: makeQueue(QUEUES.interviewReport, { attempts: 2 }),
  // Notifications are cheap but must not block anything else; higher retry count.
  [QUEUES.notifications]: makeQueue(QUEUES.notifications, { attempts: 5, backoff: { type: 'fixed', delay: 3000 } }),
};

export function getQueue(name) {
  const q = queues[name];
  if (!q) throw new Error(`Unknown queue: ${name}`);
  return q;
}
