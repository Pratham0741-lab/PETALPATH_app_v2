import { Router } from 'express';
import { videoProgressController } from './video-progress.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Secure all progress endpoints under JWT validation middleware
router.use(authMiddleware as any);

router.get('/:videoId', videoProgressController.getProgress as any);
router.post('/', videoProgressController.saveProgress as any);
router.post('/complete', videoProgressController.completeVideo as any);

export { router as videoProgressRoutes };
