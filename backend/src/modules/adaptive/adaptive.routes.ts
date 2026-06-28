import { Router } from 'express';
import { adaptiveController } from './adaptive.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.post('/process', adaptiveController.processPerformance as any);
router.get('/profile', adaptiveController.getProfile as any);
router.get('/modality', adaptiveController.getModalityPerformances as any);
router.get('/recommendations', adaptiveController.getRecommendations as any);
router.get('/events', adaptiveController.getEvents as any);

export { router as adaptiveRoutes };
