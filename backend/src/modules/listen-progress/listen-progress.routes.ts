import { Router } from 'express';
import { listenProgressController } from './listen-progress.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Secure all listen progress endpoints under JWT validation middleware
router.use(authMiddleware as any);

router.get('/:activityId', listenProgressController.getProgress as any);
router.post('/', listenProgressController.saveProgress as any);
router.post('/complete', listenProgressController.completeListen as any);

export { router as listenProgressRoutes };
