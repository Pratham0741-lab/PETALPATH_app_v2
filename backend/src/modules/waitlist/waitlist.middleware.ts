import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { sendWaitlistError } from './waitlist.responses.js';

/** Every path the waitlist is served on. All middleware below covers all three. */
export const WAITLIST_PATHS = ['/api/waitlist', '/api/v1/waitlist', '/waitlist'];

export const isWaitlistPath = (path: string): boolean =>
  WAITLIST_PATHS.some((base) => path === base || path.startsWith(`${base}/`));

/* -------------------------------------------------------------------------- */
/* CORS                                                                        */
/* -------------------------------------------------------------------------- */

const allowedOrigins = env.WAITLIST_ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (env.NODE_ENV === 'development') {
  // The website's Vite dev server and `vite preview`.
  allowedOrigins.push('http://localhost:5173', 'http://localhost:4173');
}

/**
 * Exact origins from WAITLIST_ALLOWED_ORIGINS; no wildcard (env.ts rejects
 * one), POST and OPTIONS only, no credentials. app.ts mounts this BEFORE the
 * app-wide CORS and skips the app-wide one on these paths, so the waitlist
 * never carries the app's `Access-Control-Allow-Credentials: true`.
 *
 * CORS is not access control: it only decides which browser pages may READ
 * the response. Non-browser clients (the mobile app) send no Origin and are
 * unaffected.
 */
export const waitlistCors = cors({
  origin: allowedOrigins,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
  maxAge: 600,
  optionsSuccessStatus: 204,
});

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                               */
/* -------------------------------------------------------------------------- */

function rateLimitedHandler(req: Request, res: Response) {
  const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
  const seconds = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : 60;
  res.setHeader('Retry-After', String(seconds));
  return sendWaitlistError(req, res, 429, 'rate_limited');
}

/**
 * Per client IP (WAITLIST_RATE_LIMIT_PER_MINUTE, default 5/min). Keyed on
 * req.ip, which is only the real client when TRUST_PROXY matches the
 * deployment; see app.ts. IPv6 addresses are grouped by /56 (library default).
 */
export const waitlistIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.WAITLIST_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitedHandler,
});

/**
 * Whole route (WAITLIST_RATE_LIMIT_PER_HOUR, default 300/hour), shared by
 * every client: a ceiling on a distributed flood that per-IP limits miss.
 * Mounted after the per-IP limiter so a client already blocked per-IP does
 * not use up everyone else's budget.
 */
export const waitlistGlobalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.WAITLIST_RATE_LIMIT_PER_HOUR,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: () => 'waitlist-global',
  handler: rateLimitedHandler,
});

/* -------------------------------------------------------------------------- */
/* Errors raised before the controller runs                                    */
/* -------------------------------------------------------------------------- */

/**
 * The app-wide express.json() runs before the waitlist route; a malformed or
 * oversized body throws there and would reach the global handler as a 500 in a
 * different shape. This handler, mounted on WAITLIST_PATHS ahead of the global
 * one, answers those as 400 invalid_input and anything else as 500
 * server_error. A 404 (e.g. GET on the path) is left to the global handler.
 */
export function waitlistErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) return next(err);
  const e = err as { status?: number; statusCode?: number; type?: string };
  const status = e?.statusCode ?? e?.status;
  if (status === 404) return next(err);
  if (e?.type === 'entity.parse.failed' || status === 400 || status === 413 || status === 415) {
    return sendWaitlistError(req, res, 400, 'invalid_input');
  }
  return sendWaitlistError(req, res, 500, 'server_error');
}
