import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { accountDeletionLimiter } from '../../middleware/rate-limit.middleware.js';
import { accountDeletionController } from './account-deletion.controller.js';

const router = Router();

// DELETE /api/account: the signed-in parent's whole account.
router.delete('/', authMiddleware as any, accountDeletionLimiter, accountDeletionController.deleteAccount as any);

export { router as accountRoutes };
