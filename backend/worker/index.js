/**
 * AI Worker process — separate from the API server.
 *
 * Consumes the expensive queues (resume analysis, skill gap, roadmap, job
 * extraction, interview report). Running these in their own process means:
 *  - The API stays responsive while LLM calls take 5–30s.
 *  - Worker concurrency caps act as a second layer of LLM cost/rate control.
 *  - Worker crashes never take down the HTTP server.
 *
 * The `notifications` queue is intentionally consumed by the API process
 * instead, because in-app delivery pushes over the WebSocket connections
 * held there.
 */
import { Worker } from 'bullmq';
import { connectDatabase } from '../src/config/db.js';
import { redis } from '../src/config/redis.js';
import { QUEUES } from '../src/queue/queues.js';
import { registerNotificationListeners } from '../src/notifications/notificationService.js';
import { processResumeAnalysis } from './processors/resumeAnalysis.js';
import { processSkillGap, processRoadmap } from './processors/analysisProcessors.js';
import { processJobExtraction } from './processors/jobExtraction.js';
import { processInterviewReport } from './processors/interviewReport.js';

// Worker-side listeners: completions happen HERE, so events are emitted here
// and translated into notification queue jobs (delivered by the API process).
registerNotificationListeners();

const processors = {
  [QUEUES.resumeAnalysis]: processResumeAnalysis,
  [QUEUES.skillGap]: processSkillGap,
  [QUEUES.roadmap]: processRoadmap,
  [QUEUES.jobExtraction]: processJobExtraction,
  [QUEUES.interviewReport]: processInterviewReport,
};

// Concurrency per queue: LLM-bound work is throttled deliberately.
const concurrency = {
  [QUEUES.resumeAnalysis]: 2,
  [QUEUES.skillGap]: 3,
  [QUEUES.roadmap]: 2,
  [QUEUES.jobExtraction]: 4,
  [QUEUES.interviewReport]: 2,
};

async function main() {
  await connectDatabase();

  for (const [name, processor] of Object.entries(processors)) {
    const worker = new Worker(name, processor, { connection: redis, concurrency: concurrency[name] || 2 });

    worker.on('completed', (job) => console.log(`[worker:${name}] job ${job.id} done`));
    worker.on('failed', (job, err) =>
      console.error(`[worker:${name}] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`)
    );
    worker.on('error', (err) => console.error(`[worker:${name}] error:`, err.message));
  }

  console.log(`[worker] listening on queues: ${Object.keys(processors).join(', ')}`);
}

main().catch((err) => {
  console.error('[worker] fatal startup error:', err);
  process.exit(1);
});
