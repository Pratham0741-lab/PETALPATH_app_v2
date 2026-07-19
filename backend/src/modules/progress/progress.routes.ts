import { Router } from 'express';
import { progressController } from './progress.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', progressController.getAll as any);
router.get('/overview', progressController.getOverview as any);
router.get('/summary', progressController.getSummary as any);
router.post('/complete', progressController.completeLesson as any);
router.post('/activity/complete', progressController.completeActivity as any);
router.post('/module/complete', progressController.completeModule as any);
router.post('/category/complete', progressController.completeCategory as any);
router.post('/reset', progressController.resetProgress as any);
router.get('/:lessonId', progressController.getById as any);

export { router as progressRoutes };
