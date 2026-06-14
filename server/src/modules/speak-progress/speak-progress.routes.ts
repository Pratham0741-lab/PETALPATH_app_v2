import { Router } from 'express';
import { speakProgressController } from './speak-progress.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Secure all speak progress endpoints under JWT validation middleware
router.use(authMiddleware as any);

router.get('/:activityId', speakProgressController.getProgress as any);
router.post('/', speakProgressController.saveProgress as any);
router.post('/complete', speakProgressController.completeSpeak as any);

export { router as speakProgressRoutes };
