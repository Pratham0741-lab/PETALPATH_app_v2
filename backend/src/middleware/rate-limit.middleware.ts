import crypto from 'crypto';
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

const RESET_LIMITED = { success: false, message: 'Too many requests. Please wait a while and try again.' };

/**
 * Password reset requests per client IP (PASSWORD_RESET_PER_IP_MAX per 15
 * minutes). Mounted on the route in every environment.
 */
export const passwordResetIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.PASSWORD_RESET_PER_IP_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: RESET_LIMITED,
});

/**
 * Password reset requests per email address (PASSWORD_RESET_PER_EMAIL_MAX per
 * hour), whatever IP they come from, so one inbox cannot be flooded. Applies to
 * every address alike, known or not, so a 429 says nothing about whether an
 * account exists. The key is a hash of the normalised address, so addresses
 * are not held in memory. Requests without a usable email fall through to
 * validation (400) without counting.
 */
export const passwordResetEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.PASSWORD_RESET_PER_EMAIL_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => typeof req.body?.email !== 'string' || req.body.email.trim() === '',
  keyGenerator: (req) =>
    'reset-email:' + crypto.createHash('sha256').update(String(req.body.email).trim().toLowerCase()).digest('hex'),
  message: RESET_LIMITED,
});

/** Reset-code attempts per client IP (PASSWORD_RESET_ATTEMPTS_PER_IP_MAX per 15 minutes). */
export const passwordResetAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.PASSWORD_RESET_ATTEMPTS_PER_IP_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: RESET_LIMITED,
});
