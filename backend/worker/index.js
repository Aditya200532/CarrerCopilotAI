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
import { redisConnectionOptions, waitForRedis } from '../src/config/redis.js';
import { QUEUES, getQueue } from '../src/queue/queues.js';
import { Job } from '../src/models/index.js';
import { registerNotificationListeners } from '../src/notifications/notificationService.js';
import { processResumeAnalysis } from './processors/resumeAnalysis.js';
import { processSkillGap, processRoadmap } from './processors/analysisProcessors.js';
import { processJobExtraction } from './processors/jobExtraction.js';
import { processInterviewReport } from './processors/interviewReport.js';

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
  await waitForRedis();

  // Worker-side listeners: completions happen HERE, so events are emitted
  // here and translated into notification queue jobs (delivered by the API
  // process). Registered after DB/Redis are up so listeners never fire
  // against a disconnected client.
  registerNotificationListeners();

  for (const [name, processor] of Object.entries(processors)) {
    const worker = new Worker(name, processor, { connection: redisConnectionOptions, concurrency: concurrency[name] || 2 });

    worker.on('completed', (job) => console.log(`[worker:${name}] job ${job.id} done`));
    worker.on('failed', (job, err) =>
      console.error(`[worker:${name}] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`)
    );
    worker.on('error', (err) => console.error(`[worker:${name}] error:`, err.message));
  }

  console.log(`[worker] listening on queues: ${Object.keys(processors).join(', ')}`);

  await requeueUnextractedJobs();
}

// Queue entries are lost if Redis is wiped/replaced; re-enqueue any job whose extraction never ran.
async function requeueUnextractedJobs() {
  const pending = await Job.find({ status: 'active', requiredSkills: { $size: 0 }, skillsExtractedAt: null })
    .select('_id').lean();
  const queue = getQueue(QUEUES.jobExtraction);
  for (const j of pending) {
    await queue.add('extract', { jobId: String(j._id) }, { jobId: `extract-${j._id}` });
  }
  if (pending.length) console.log(`[worker] re-queued skill extraction for ${pending.length} job(s)`);
}

main().catch((err) => {
  console.error('[worker] fatal startup error:', err);
  process.exit(1);
});
