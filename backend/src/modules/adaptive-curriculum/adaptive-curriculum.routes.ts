import { Router } from 'express';
import { adaptiveCurriculumController } from './adaptive-curriculum.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { adminMiddleware } from '../../middleware/admin.middleware.js';

// ─── Public (read‑only) routes ───────────────────────────────────────────────
const publicRouter = Router();
publicRouter.use(authMiddleware as any);

publicRouter.get('/skills/search', adaptiveCurriculumController.searchSkills as any);
publicRouter.get('/skills/:id', adaptiveCurriculumController.getSkillDetail as any);
publicRouter.get('/grades', adaptiveCurriculumController.getGrades as any);
publicRouter.get('/grades/:id', adaptiveCurriculumController.getGrade as any);
publicRouter.get('/domains', adaptiveCurriculumController.getDomains as any);
publicRouter.get('/domains/:id', adaptiveCurriculumController.getDomain as any);
publicRouter.get('/domains/by-subject/:subjectId', adaptiveCurriculumController.getDomainsBySubject as any);
publicRouter.get('/skills/:id/tags', adaptiveCurriculumController.getSkillTags as any);
publicRouter.get('/skills/:id/activities', adaptiveCurriculumController.getSkillActivities as any);
publicRouter.get('/skills/:id/assessments', adaptiveCurriculumController.getSkillAssessments as any);

// ─── Admin (write) routes ────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authMiddleware as any);
adminRouter.use(adminMiddleware as any);

adminRouter.post('/grades', adaptiveCurriculumController.createGrade as any);
adminRouter.put('/grades/:id', adaptiveCurriculumController.updateGrade as any);
adminRouter.delete('/grades/:id', adaptiveCurriculumController.deleteGrade as any);
adminRouter.post('/domains', adaptiveCurriculumController.createDomain as any);
adminRouter.put('/domains/:id', adaptiveCurriculumController.updateDomain as any);
adminRouter.delete('/domains/:id', adaptiveCurriculumController.deleteDomain as any);
adminRouter.post('/skills/:id/tags', adaptiveCurriculumController.addSkillTag as any);
adminRouter.delete('/skills/:id/tags/:tagId', adaptiveCurriculumController.removeSkillTag as any);
adminRouter.post('/skills/:id/activities', adaptiveCurriculumController.createSkillActivity as any);
adminRouter.put('/skills/:id/activities/:activityId', adaptiveCurriculumController.updateSkillActivity as any);
adminRouter.delete('/skills/:id/activities/:activityId', adaptiveCurriculumController.deleteSkillActivity as any);
adminRouter.post('/skills/:id/assessments', adaptiveCurriculumController.createSkillAssessment as any);
adminRouter.put('/skills/:id/assessments/:assessmentId', adaptiveCurriculumController.updateSkillAssessment as any);
adminRouter.delete('/skills/:id/assessments/:assessmentId', adaptiveCurriculumController.deleteSkillAssessment as any);
adminRouter.post('/bulk-import', adaptiveCurriculumController.bulkImport as any);

export {
  publicRouter as adaptiveCurriculumPublicRoutes,
  adminRouter as adaptiveCurriculumAdminRoutes,
};
