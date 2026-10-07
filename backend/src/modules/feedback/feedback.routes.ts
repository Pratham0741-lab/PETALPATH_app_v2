import { Router } from 'express';
import { feedbackController } from './feedback.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { feedbackLimiter } from '../../middleware/rate-limit.middleware.js';

const router = Router();

router.use(authMiddleware as any);

// Limiter after auth, so it can key on the parent rather than the IP.
router.post('/', feedbackLimiter, feedbackController.submit as any);

export { router as feedbackRoutes };
