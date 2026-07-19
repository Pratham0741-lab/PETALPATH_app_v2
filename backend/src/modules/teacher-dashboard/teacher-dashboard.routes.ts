import { Router } from 'express';
import { teacherDashboardController } from './teacher-dashboard.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertClassroomAccess } from '../../middleware/assert-classroom-access.middleware.js';

const router = Router();

// Apply auth middleware to all teacher dashboard endpoints
router.use(authMiddleware as any);

// Apply classroom-level security validation checking teacher context
router.use('/classroom/:classroomId', assertClassroomAccess as any);
router.use('/classroom/:classroomId/learner/:childId', assertClassroomAccess as any);

router.get('/classroom/:classroomId', teacherDashboardController.getClassroomDashboard as any);
router.get('/classroom/:classroomId/progress', teacherDashboardController.getClassroomProgress as any);
router.get('/classroom/:classroomId/learner/:childId', teacherDashboardController.getLearnerProgress as any);
router.get('/classroom/:classroomId/themes', teacherDashboardController.getClassroomThemeProgress as any);
router.get('/classroom/:classroomId/subjects', teacherDashboardController.getClassroomSubjectProgress as any);
router.get('/classroom/:classroomId/assessments', teacherDashboardController.getClassroomAssessmentSummary as any);
router.get('/classroom/:classroomId/mastery', teacherDashboardController.getClassroomMasterySummary as any);
router.get('/classroom/:classroomId/learner/:childId/assessments', teacherDashboardController.getLearnerAssessmentSummary as any);
router.get('/classroom/:classroomId/learner/:childId/history', teacherDashboardController.getLearnerHistory as any);
router.get('/classroom/:classroomId/achievements', teacherDashboardController.getClassroomAchievements as any);

export { router as teacherDashboardRoutes };
