import { Router } from 'express';
import { audioController } from './audio.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Secure all audio endpoints under JWT validation middleware
router.use(authMiddleware as any);

router.get('/', audioController.getAll as any);
router.get('/:id', audioController.getById as any);

export { router as audioRoutes };
