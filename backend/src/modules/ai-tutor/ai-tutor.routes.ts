import { Router } from 'express';
import { aiTutorController } from './ai-tutor.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

router.post('/:childId/sessions', authMiddleware, assertChildOwnership, aiTutorController.startSession.bind(aiTutorController));
router.post('/:childId/sessions/:sessionId/resume', authMiddleware, assertChildOwnership, aiTutorController.resumeSession.bind(aiTutorController));
router.post('/:childId/sessions/:sessionId/end', authMiddleware, assertChildOwnership, aiTutorController.endSession.bind(aiTutorController));
router.get('/:childId/sessions/:sessionId/next-activity', authMiddleware, assertChildOwnership, aiTutorController.getNextActivity.bind(aiTutorController));
router.post('/:childId/sessions/:sessionId/progress', authMiddleware, assertChildOwnership, aiTutorController.recordProgress.bind(aiTutorController));

export default router;
