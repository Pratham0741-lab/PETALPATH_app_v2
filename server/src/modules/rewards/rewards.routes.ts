import { Router } from 'express';
import { rewardsController } from './rewards.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', rewardsController.getAll as any);
router.get('/stickers', rewardsController.getStickers as any);
router.get('/badges', rewardsController.getBadges as any);

export { router as rewardsRoutes };
