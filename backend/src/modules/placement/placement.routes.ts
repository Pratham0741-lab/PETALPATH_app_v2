import { Router, Request, Response, NextFunction } from 'express';
import { placementController } from './placement.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

const bodyChildToParam = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body?.childId) {
    req.params.childId = req.body.childId;
  }
  next();
};

router.get('/questionnaire', authMiddleware as any, placementController.getQuestionnaire as any);
router.post('/start', authMiddleware as any, bodyChildToParam, assertChildOwnership as any, placementController.startPlacement as any);
router.post('/start-from-beginning', authMiddleware as any, bodyChildToParam, assertChildOwnership as any, placementController.startFromBeginning as any);
router.post('/children/:childId/answer', authMiddleware as any, assertChildOwnership as any, placementController.submitAnswer as any);
router.post('/children/:childId/complete', authMiddleware as any, assertChildOwnership as any, placementController.completePlacement as any);
router.get('/children/:childId/result/:attemptId', authMiddleware as any, assertChildOwnership as any, placementController.getPlacementResult as any);
router.post('/children/:childId/restart', authMiddleware as any, assertChildOwnership as any, placementController.restartPlacement as any);

export { router as placementRoutes };
