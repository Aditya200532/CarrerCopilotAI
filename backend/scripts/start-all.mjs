import { spawn } from 'node:child_process';

/**
 * Runs the API server and the AI worker as child processes of one container.
 * Used on hosts where a single (free) service is all you get — the two-process
 * separation still holds in code, they just share a machine here.
 */
const procs = [
  spawn(process.execPath, ['src/server.js'], { stdio: 'inherit', cwd: import.meta.dirname }),
  spawn(process.execPath, ['worker/index.js'], { stdio: 'inherit', cwd: import.meta.dirname }),
];

// If either dies, stop the other so the platform restarts both together.
for (const p of procs) {
  p.on('exit', (code) => {
    for (const other of procs) if (other.exitCode === null) other.kill();
    process.exit(code ?? 1);
  });
}
