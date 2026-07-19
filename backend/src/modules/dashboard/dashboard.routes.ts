import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

// Apply auth middleware to all dashboard endpoints
router.use(authMiddleware as any);

// Secure endpoints by checking if the active parent owns the childId
router.use('/:childId', assertChildOwnership as any);

router.get('/:childId', dashboardController.getDashboardOverview as any);
router.get('/:childId/progress', dashboardController.getCurriculumProgress as any);
router.get('/:childId/themes', dashboardController.getThemeProgress as any);
router.get('/:childId/subjects', dashboardController.getSubjectProgress as any);
router.get('/:childId/assessments', dashboardController.getAssessmentSummary as any);
router.get('/:childId/mastery', dashboardController.getMasterySummary as any);
router.get('/:childId/history', dashboardController.getLearningHistory as any);
router.get('/:childId/rewards', dashboardController.getEarnedRewards as any);
router.get('/:childId/achievements', dashboardController.getAchievements as any);

export { router as dashboardRoutes };
