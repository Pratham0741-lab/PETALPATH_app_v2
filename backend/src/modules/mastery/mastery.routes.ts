import { Router } from 'express';
import { masteryController } from './mastery.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.post('/update', masteryController.updatePerformance as any);
router.get('/weak-skills', masteryController.getWeakSkills as any);
router.get('/child/:childId', masteryController.getChildSkills as any);
router.get('/:skillId', masteryController.getSkillHealth as any);

export { router as masteryRoutes };
