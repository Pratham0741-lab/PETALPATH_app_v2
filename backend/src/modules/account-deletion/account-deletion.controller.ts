import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { accountDeletionService } from './account-deletion.service.js';

/** Exactly one proof of recent sign-in. */
export const DeleteAccountSchema = z.union([
  z.object({ password: z.string().min(1) }).strict(),
  z.object({ googleIdToken: z.string().min(1) }).strict(),
]);

const requestIdOf = (req: AuthenticatedRequest) => (req as unknown as { requestId?: string }).requestId;

/**
 * Logs carry only the outcome and the request id: never an email, a name, or
 * a child or user id.
 */
function logOutcome(req: AuthenticatedRequest, action: string, outcome: string) {
  logger.info({ requestId: requestIdOf(req), action, outcome }, 'deletion');
}

export class AccountDeletionController {
  /** DELETE /api/children/:id */
  async deleteChild(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await accountDeletionService.deleteChild(req.user!.userId, String(req.params.id));
      logOutcome(req, 'child', 'deleted');
      return res.status(200).json({ success: true, data: { deleted: true } });
    } catch (error) {
      logOutcome(req, 'child', (error as { statusCode?: number }).statusCode === 404 ? 'not_found' : 'failed');
      next(error);
    }
  }

  /** DELETE /api/account */
  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = DeleteAccountSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Send either your password or a fresh Google sign-in to delete the account');
      }
      await accountDeletionService.deleteAccount(req.user!.userId, parsed.data);
      logOutcome(req, 'account', 'deleted');
      return res.status(200).json({ success: true, data: { deleted: true } });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      logOutcome(req, 'account', status === 403 ? 'reauth_refused' : status === 400 ? 'invalid' : 'failed');
      next(error);
    }
  }
}

export const accountDeletionController = new AccountDeletionController();
