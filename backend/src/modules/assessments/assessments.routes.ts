import { Router } from 'express';
import { assessmentsController } from './assessments.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

router.use(authMiddleware as any);

// Assessment catalog (any authenticated parent)
router.get('/', assessmentsController.listAssessments as any);
router.get('/:id', assessmentsController.getAssessment as any);
router.post('/', assessmentsController.createAssessment as any);

// Child-scoped attempts — IDOR safeguard via assertChildOwnership
router.use('/:childId', assertChildOwnership as any);
router.post('/:childId/attempts', assessmentsController.startAttempt as any);
router.get('/:childId/attempts', assessmentsController.getAttemptHistory as any);
router.post('/:childId/attempts/:attemptId/submit', assessmentsController.submitAttempt as any);
router.get('/:childId/attempts/:attemptId', assessmentsController.getAttempt as any);

export { router as assessmentsRoutes };
