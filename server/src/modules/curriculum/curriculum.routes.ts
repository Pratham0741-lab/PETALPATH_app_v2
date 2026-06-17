import { Router } from 'express';
import { curriculumController } from './curriculum.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', curriculumController.getCurriculum as any);
router.get('/available', curriculumController.getAvailableSkills as any);
router.get('/next', curriculumController.getNextRecommendations as any);
router.get('/subject/:subjectId', curriculumController.getSubjectCurriculum as any);
router.post('/generate', curriculumController.generateCurriculum as any);
router.post('/activate', curriculumController.activateSkill as any);
router.post('/complete', curriculumController.completeSkill as any);

export { router as curriculumRoutes };
