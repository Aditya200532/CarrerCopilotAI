import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/** Global API limiter — protects the server from abuse. */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Stricter limiter for endpoints that trigger LLM calls (directly or via queue).
 * LLM APIs have hard usage/cost limits, so expensive operations are throttled
 * per-user independently of the general API traffic.
 */
export const aiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.aiMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    message: 'AI request limit reached. LLM calls are rate limited to control cost — try again later.',
  },
});
