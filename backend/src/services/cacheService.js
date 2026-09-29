import crypto from 'node:crypto';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';

/**
 * Redis caching layer for REUSABLE AI responses only.
 *
 * Cache policy (a viva talking point):
 *  - Generic, user-independent content (topic explanations, question banks)
 *    is cached with long TTLs — any student asking for "binary search
 *    explanation" gets the same cached answer; no LLM call needed.
 *  - Personalized results (resume analysis, skill gaps, roadmaps) are NOT put
 *    in this shared cache. They are produced by queue workers and persisted in
 *    MongoDB (AIAnalysis), keyed by user/document — correct by construction.
 *
 * Every key is namespaced under "ai:" and includes a content hash so that a
 * different prompt never collides with a cached entry.
 */

const PREFIX = 'ai';

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 24);
}

export const cacheKeys = {
  topicExplanation: (topic, style) => `${PREFIX}:topic:${hash(`${topic}|${style}`)}`,
  questionBank: (role, round, difficulty, n) =>
    `${PREFIX}:qbank:${hash(`${role}|${round}|${difficulty}|${n}`)}`,
  jobSkillExtraction: (description) => `${PREFIX}:jobextract:${hash(description)}`,
};

export const cacheService = {
  async get(key) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      // A cache outage must never take down the API — degrade to LLM calls.
      console.warn(`[cache] GET ${key} failed:`, err.message);
      return null;
    }
  },

  async set(key, value, ttlSeconds) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      console.warn(`[cache] SET ${key} failed:`, err.message);
    }
  },

  /** get-or-compute with TTL — the canonical cache-aside pattern. */
  async wrap(key, ttlSeconds, computeFn) {
    const hit = await this.get(key);
    if (hit) return { value: hit, cached: true };
    const value = await computeFn();
    await this.set(key, value, ttlSeconds);
    return { value, cached: false };
  },

  ttls: {
    topic: env.cache.topicTtl,
    question: env.cache.questionTtl,
    jobExtraction: env.cache.topicTtl, // JD text rarely changes; long TTL is safe
  },
};
