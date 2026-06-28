import { Router } from 'express';
import { writeProgressController } from './write-progress.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Secure all write progress endpoints under JWT validation middleware
router.use(authMiddleware as any);

router.get('/:activityId', writeProgressController.getProgress as any);
router.post('/', writeProgressController.saveProgress as any);
router.post('/complete', writeProgressController.completeWrite as any);

export { router as writeProgressRoutes };
