import { Router } from 'express';
import { childrenController } from './children.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';
import { baselineController } from '../baseline/baseline.controller.js';
import { accountDeletionController } from '../account-deletion/account-deletion.controller.js';
import { childDeletionLimiter } from '../../middleware/rate-limit.middleware.js';

const router = Router();

// Secure all endpoints in this route stack
router.use(authMiddleware as any);

router.get('/', childrenController.getAll as any);
router.get('/:id', childrenController.getById as any);
router.post('/', childrenController.create as any);
router.put('/:id', childrenController.update as any);
// Hard delete: the child and all their data (account-deletion module).
router.delete('/:id', childDeletionLimiter, accountDeletionController.deleteChild as any);

// Baseline questionnaire result (one per child).
router.get('/:childId/baseline', assertChildOwnership as any, baselineController.get as any);
router.post('/:childId/baseline', assertChildOwnership as any, baselineController.save as any);

export { router as childrenRoutes };
