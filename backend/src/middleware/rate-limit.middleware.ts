import rateLimit from 'express-rate-limit';
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
