import { Request, Response } from 'express';
import { logger } from '../../utils/logger.js';

export type WaitlistLogOutcome =
  | 'created'
  | 'duplicate'
  | 'honeypot'
  | 'invalid_input'
  | 'rate_limited'
  | 'server_error';

export type WaitlistErrorCode = 'invalid_input' | 'rate_limited' | 'server_error';

const requestIdOf = (req: Request): string =>
  (req as Request & { requestId?: string }).requestId ?? 'unknown';

/**
 * The only waitlist log line. Outcome and request id ONLY: never the email,
 * the name, the body, the IP or an error message (a database error message can
 * quote the value that failed).
 */
export function logWaitlist(req: Request, outcome: WaitlistLogOutcome): void {
  const entry = { requestId: requestIdOf(req), outcome };
  if (outcome === 'server_error') logger.error(entry, 'waitlist');
  else logger.info(entry, 'waitlist');
}

/** The single error response shape: { ok: false, error }. */
export function sendWaitlistError(
  req: Request,
  res: Response,
  status: 400 | 429 | 500,
  error: WaitlistErrorCode
) {
  logWaitlist(req, error);
  return res.status(status).json({ ok: false, error });
}
