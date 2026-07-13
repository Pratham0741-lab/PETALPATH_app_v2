/**
 * Learner routes — /v1/learner/:childId/*
 *
 * Applies authMiddleware → assertChildOwnership on every route. The
 * assertChildOwnership middleware is the new IDOR safeguard for the
 * :childId path parameter.
 *
 * Existing legacy endpoints (`/adaptive`, `/mastery`, etc.) are unchanged
 * in Phase 1 per the "preserve existing APIs" requirement. The design's
 * retro-application of assertChildOwnership to the legacy routes is
 * scheduled for a follow-up patch alongside the recordPerformance work.
 */

import { Router } from 'express';
import { learnerController } from './learner.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

router.use(authMiddleware as any);
router.use('/:childId', assertChildOwnership as any);

router.get('/:childId/state', learnerController.getState as any);
router.get('/:childId/recommendation', learnerController.getRecommendation as any);

export { router as learnerRoutes };
