import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to secure all analytics routes
router.use(authMiddleware as any);

router.get('/', analyticsController.getSnapshot as any);
router.get('/history', analyticsController.getHistory as any);
router.get('/trends', analyticsController.getTrends as any);
router.get('/subjects', analyticsController.getSubjects as any);
router.get('/insights', analyticsController.getInsights as any);
router.get('/report', analyticsController.getReport as any);

// Phase 3.3 — parent-facing aggregated analytics
router.get('/overview', analyticsController.getOverview as any);
router.get('/activity', analyticsController.getActivity as any);
router.get('/progress', analyticsController.getProgress as any);
router.get('/rewards', analyticsController.getRewards as any);
router.get('/timeline', analyticsController.getTimeline as any);

export { router as analyticsRoutes };
