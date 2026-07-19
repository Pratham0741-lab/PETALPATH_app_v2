import { Router } from 'express';
import { roadmapController } from './roadmap.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', roadmapController.getRoadmap as any);
router.get('/current', roadmapController.getCurrentLesson as any);
router.get('/current-theme', roadmapController.getCurrentTheme as any);
router.get('/current-grade', roadmapController.getCurrentGrade as any);

export { router as roadmapRoutes };
