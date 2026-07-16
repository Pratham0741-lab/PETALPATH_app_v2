import { Router } from 'express';
import { adaptationController } from './adaptation.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

router.post('/:childId/analyze', authMiddleware, assertChildOwnership, adaptationController.analyze.bind(adaptationController));
router.get('/:childId/profile', authMiddleware, assertChildOwnership, adaptationController.getProfile.bind(adaptationController));

export { router as adaptationRoutes };
