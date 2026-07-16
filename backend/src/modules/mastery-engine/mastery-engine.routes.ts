import { Router } from 'express';
import { masteryEngineController } from './mastery-engine.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

router.post(
  '/:childId/evaluate',
  authMiddleware,
  assertChildOwnership,
  (req, res) => masteryEngineController.evaluateMastery(req, res),
);

router.post(
  '/:childId/recalculate/:skillId',
  authMiddleware,
  assertChildOwnership,
  (req, res) => masteryEngineController.recalculateMastery(req, res),
);

router.get(
  '/:childId/skills/:skillId',
  authMiddleware,
  assertChildOwnership,
  (req, res) => masteryEngineController.getSkillMastery(req, res),
);

router.get(
  '/:childId/skills/:skillId/history',
  authMiddleware,
  assertChildOwnership,
  (req, res) => masteryEngineController.getSkillHistory(req, res),
);

router.get(
  '/:childId/revision-queue',
  authMiddleware,
  assertChildOwnership,
  (req, res) => masteryEngineController.getRevisionQueue(req, res),
);

router.post(
  '/:childId/revision',
  authMiddleware,
  assertChildOwnership,
  (req, res) => masteryEngineController.processRevision(req, res),
);

export default router;
