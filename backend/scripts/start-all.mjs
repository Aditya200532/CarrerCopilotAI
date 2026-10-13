import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Runs the API server and the AI worker as child processes of one container.
 * Used on hosts where a single (free) service is all you get — the two-process
 * separation still holds in code, they just share a machine here.
 */
const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(scriptDir, '..');

const procs = [
  spawn(process.execPath, ['src/server.js'], { stdio: 'inherit', cwd: backendDir }),
  spawn(process.execPath, ['worker/index.js'], { stdio: 'inherit', cwd: backendDir }),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const proc of procs) {
    if (proc.exitCode === null && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(exitCode), 1000).unref();
}

for (const proc of procs) {
  proc.on('error', (error) => {
    console.error('Failed to start child process:', error);
    shutdown(1);
  });

  proc.on('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`Child process exited: code=${code}, signal=${signal}`);
      shutdown(code ?? 1);
    }
  });
}

// Render sends SIGTERM on deploys/restarts — forward it to both children.
process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
