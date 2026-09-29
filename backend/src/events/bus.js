import { EventEmitter } from 'node:events';

/**
 * In-process event bus (event-driven architecture).
 *
 * Domain code emits facts ("analysis.completed"); it never calls the
 * notification layer directly. Listeners translate events into queued
 * notification jobs, so the core services stay decoupled from delivery
 * concerns. Swapping in a distributed bus later means changing only this file.
 */
export const bus = new EventEmitter();
bus.setMaxListeners(50);

export const EVENTS = {
  ANALYSIS_COMPLETED: 'analysis.completed',
  ANALYSIS_FAILED: 'analysis.failed',
  INTERVIEW_SCHEDULED: 'interview.scheduled',
  INTERVIEW_REPORT_READY: 'interview.reportReady',
  PLAN_GENERATED: 'plan.generated',
  TASK_COMPLETED: 'task.completed',
};

export function emit(event, payload) {
  bus.emit(event, payload);
}

export function on(event, handler) {
  // Never let a listener crash the emitter.
  bus.on(event, (payload) => {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[events] handler for ${event} failed:`, err);
    }
  });
}
