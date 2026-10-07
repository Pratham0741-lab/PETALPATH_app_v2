import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { AuthenticatedRequest } from './auth.middleware.js';
import { env } from '../config/env.js';

export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: env.RATE_LIMIT_STRICT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

export const moderateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: env.RATE_LIMIT_MODERATE_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Lesson feedback. Unlike the limiters above this one is mounted on its route
 * in every environment, and is keyed by the signed-in parent rather than the
 * IP: a family on one home Wi-Fi shares an address, and a parent on mobile data
 * changes it. Must run after `authMiddleware`; falls back to the IP only if it
 * somehow does not.
 */
export const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: env.RATE_LIMIT_FEEDBACK_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req as AuthenticatedRequest).user?.userId ?? ipKeyGenerator(req.ip ?? ''),
  message: { success: false, message: 'Too much feedback at once, please try again later.' },
});
