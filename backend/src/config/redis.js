import IORedis from 'ioredis';
import { env } from './env.js';

/**
 * A single Redis instance is used for two DISTINCT purposes:
 *  1. Cache  ("do we already have this result?")  — via cacheService
 *  2. Queues ("which task should run async?")     — via BullMQ
 * They are logically separated; cache keys live under an `ai:` prefix and
 * cache writes use TTLs, while queue data is owned exclusively by BullMQ.
 */

function parseRedisUrl(redisUrl) {
  const u = new URL(redisUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    db: u.pathname && u.pathname !== '/' ? Number(u.pathname.slice(1)) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
}

// BullMQ should open its own dedicated connections (one per Queue/Worker)
// rather than share a single client — Workers hold blocking connections that
// can't be safely multiplexed. Pass plain options so BullMQ can `new
// IORedis(...)` internally and manage reconnection itself.
export const redisConnectionOptions = {
  ...parseRedisUrl(env.redisUrl),
  maxRetriesPerRequest: null, // required by BullMQ
  retryStrategy: (times) => Math.min(times * 200, 5000),
};

export function createRedisConnection() {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
}

export const redis = createRedisConnection();

// Without this listener, a connection failure (e.g. Redis not running
// locally) throws an unhandled "error" event and crashes the process.
redis.on('error', (err) => console.error('[redis] connection error:', err.message));

/** Resolves once Redis is reachable, or rejects after `timeoutMs`. Call at startup. */
export function waitForRedis(timeoutMs = 5000) {
  if (redis.status === 'ready') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      redis.off('ready', onReady);
      reject(new Error(`Redis not ready after ${timeoutMs}ms (is it running at ${env.redisUrl}?)`));
    }, timeoutMs);
    function onReady() {
      clearTimeout(timer);
      resolve();
    }
    redis.once('ready', onReady);
  });
}
