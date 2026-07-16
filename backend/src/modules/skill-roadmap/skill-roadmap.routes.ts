import { Router } from 'express';
import { skillRoadmapController } from './skill-roadmap.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { assertChildOwnership } from '../../middleware/assert-child-ownership.middleware.js';

const router = Router();

router.get('/children/:childId/roadmap', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.getRoadmap as any);
router.post('/children/:childId/refresh', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.refreshRoadmap as any);
router.get('/children/:childId/section/:section', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.getSection as any);
router.get('/children/:childId/unlocked', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.getUnlockedSkills as any);
router.get('/children/:childId/locked', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.getLockedSkills as any);
router.get('/children/:childId/review', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.getReviewSkills as any);
router.get('/children/:childId/next', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.getNextSkill as any);
router.get('/children/:childId/daily-queue', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.getDailyQueue as any);
router.post('/children/:childId/unlock/:skillId', authMiddleware as any, assertChildOwnership as any, skillRoadmapController.unlockDownstream as any);

export { router as skillRoadmapRoutes };
