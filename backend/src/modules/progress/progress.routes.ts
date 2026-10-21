import { Router } from 'express';
import { progressController } from './progress.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { env } from '../../config/env.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', progressController.getAll as any);
router.get('/overview', progressController.getOverview as any);
router.get('/summary', progressController.getSummary as any);
router.post('/complete', progressController.completeLesson as any);
router.post('/activity/complete', progressController.completeActivity as any);
// Dev tools: complete a lesson/module/category without its activities. Not
// registered unless ENABLE_DEV_TOOLS=true, so production answers them with 404.
if (env.ENABLE_DEV_TOOLS) {
  router.post('/dev/complete-lesson', progressController.devCompleteLesson as any);
  router.post('/module/complete', progressController.completeModule as any);
  router.post('/category/complete', progressController.completeCategory as any);
}
router.post('/reset', progressController.resetProgress as any);
router.get('/:lessonId', progressController.getById as any);

export { router as progressRoutes };
