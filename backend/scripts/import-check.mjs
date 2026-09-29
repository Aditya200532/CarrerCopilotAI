// Import-check the whole backend module graph without starting servers.
const mods = [
  '../src/app.js',
  '../src/realtime/interviewSocket.js',
  '../src/interviews/strategies.js',
  '../src/services/jobService.js',
  '../src/services/interviewService.js',
  '../src/services/dashboardService.js',
  '../worker/processors/resumeAnalysis.js',
  '../worker/processors/analysisProcessors.js',
  '../worker/processors/interviewReport.js',
  '../worker/processors/notifications.js',
];

try {
  const loaded = await Promise.all(mods.map((m) => import(m)));
  const app = loaded[0].createApp();
  console.log('APP_OK, express app type:', typeof app);
  console.log('IMPORT_CHECK_PASSED');
} catch (e) {
  console.error('IMPORT_FAIL:', e);
  process.exitCode = 1;
}
process.exit(process.exitCode || 0);
