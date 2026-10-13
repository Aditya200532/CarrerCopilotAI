import http from 'node:http';
import { Worker } from 'bullmq';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { redis, redisConnectionOptions, waitForRedis } from './config/redis.js';
import { env } from './config/env.js';
import { initGateway } from './realtime/gateway.js';
import { registerInterviewNamespace } from './realtime/interviewSocket.js';
import { registerNotificationListeners } from './notifications/notificationService.js';
import { QUEUES } from './queue/queues.js';
import { processNotification } from '../worker/processors/notifications.js';
import { resumeService } from './services/resumeService.js';

async function main() {
  await connectDatabase();
  await waitForRedis();
  await resumeService.ensureUploadDir();

  // API-process listeners: events emitted here (e.g. interview scheduled)
  // become notification queue jobs.
  registerNotificationListeners();

  const app = createApp();
  const server = http.createServer(app);

  // Realtime: default namespace for notification push, /interview for live rounds.
  const io = initGateway(server);
  registerInterviewNamespace(io);

  /**
   * The notifications queue is consumed IN the API process (not the AI worker)
   * because in-app delivery pushes over the WebSocket connections held here.
   * The AI worker keeps the expensive LLM queues.
   */
  const notificationWorker = new Worker(QUEUES.notifications, processNotification, {
    connection: redisConnectionOptions,
    concurrency: 10,
  });
  notificationWorker.on('failed', (job, err) =>
    console.error(`[notify-worker] job ${job?.id} failed: ${err.message}`)
  );

  server.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
    console.log(`[api] AI mode: ${env.llm.apiKey ? 'LLM configured' : 'local fallback (no OPENAI_API_KEY)'}`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down...`);
    server.close();
    await notificationWorker.close().catch(() => {});
    await redis.quit().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[api] fatal startup error:', err);
  process.exit(1);
});
