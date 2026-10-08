import { Request, Response } from 'express';
import { waitlistService, WaitlistService } from './waitlist.service.js';
import { HONEYPOT_FIELD, JoinWaitlistSchema } from './waitlist.validators.js';
import { logWaitlist, sendWaitlistError } from './waitlist.responses.js';

/**
 * POST /api/waitlist (also /api/v1/waitlist and /waitlist).
 *
 * Every response is JSON and one of exactly four shapes:
 *   200 { ok: true }                                   created, duplicate, or honeypot
 *   400 { ok: false, error: 'invalid_input' }
 *   429 { ok: false, error: 'rate_limited' }           (rate-limit middleware)
 *   500 { ok: false, error: 'server_error' }
 *
 * Errors are answered here, not passed to the app-wide error handler, which
 * uses a different shape. Logs carry the outcome and request id only; never the
 * email, name or request body.
 */
export class WaitlistController {
  constructor(private readonly service: WaitlistService = waitlistService) {}

  join = async (req: Request, res: Response) => {
    try {
      if (!req.is('application/json')) {
        return sendWaitlistError(req, res, 400, 'invalid_input');
      }

      // Honeypot first: a bot gets the ordinary success answer whether or not
      // the rest of its submission was valid, and nothing is stored.
      const body: unknown = req.body;
      const trap =
        body && typeof body === 'object'
          ? (body as Record<string, unknown>)[HONEYPOT_FIELD]
          : undefined;
      if (typeof trap === 'string' && trap.trim() !== '') {
        logWaitlist(req, 'honeypot');
        return res.status(200).json({ ok: true });
      }

      const parsed = JoinWaitlistSchema.safeParse(body);
      if (!parsed.success) {
        return sendWaitlistError(req, res, 400, 'invalid_input');
      }

      const outcome = await this.service.join({
        email: parsed.data.email,
        name: parsed.data.name,
        sourcePage: parsed.data.source_page,
      });

      // 'created' and 'duplicate' get the same status and body on purpose.
      logWaitlist(req, outcome);
      return res.status(200).json({ ok: true });
    } catch {
      return sendWaitlistError(req, res, 500, 'server_error');
    }
  };
}

export const waitlistController = new WaitlistController();
