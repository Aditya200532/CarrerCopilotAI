import IORedis from 'ioredis';
import { env } from './env.js';

/**
 * A single Redis instance is used for two DISTINCT purposes:
 *  1. Cache  ("do we already have this result?")  — via cacheService
 *  2. Queues ("which task should run async?")     — via BullMQ
 * They are logically separated; cache keys live under an `ai:` prefix and
 * cache writes use TTLs, while queue data is owned exclusively by BullMQ.
 */
export function createRedisConnection() {
  return new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
}

export const redis = createRedisConnection();
