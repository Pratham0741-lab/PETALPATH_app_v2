import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertAnalyticsAccess } from '../../middleware/assert-analytics-access.middleware.js';

const router = Router();

// Apply auth middleware to secure all analytics routes
router.use(authMiddleware as any);

router.get('/', analyticsController.getSnapshot as any);
router.get('/history', analyticsController.getHistory as any);
router.get('/trends', analyticsController.getTrends as any);
router.get('/subjects', analyticsController.getSubjects as any);
router.get('/insights', analyticsController.getInsights as any);
router.get('/report', analyticsController.getReport as any);

// Parent-facing aggregated analytics (Phase 3.3)
router.get('/overview', analyticsController.getOverview as any);
router.get('/activity', analyticsController.getActivity as any);
router.get('/progress', analyticsController.getProgress as any);
router.get('/rewards', analyticsController.getRewards as any);
router.get('/timeline', analyticsController.getTimeline as any);

// Learner, Classroom, Curriculum & Assessment analytics (Phase 8)
router.get('/learner/:childId', assertAnalyticsAccess as any, analyticsController.getLearnerAnalytics as any);
router.get('/learner/:childId/trends', assertAnalyticsAccess as any, analyticsController.getLearnerTrends as any);
router.get('/classroom/:classroomId', assertAnalyticsAccess as any, analyticsController.getClassroomAnalytics as any);
router.get('/classroom/:classroomId/trends', assertAnalyticsAccess as any, analyticsController.getClassroomTrends as any);
router.get('/curriculum/:gradeId', analyticsController.getCurriculumAnalytics as any);
router.get('/assessment/:assessmentId', analyticsController.getAssessmentAnalytics as any);

export { router as analyticsRoutes };
