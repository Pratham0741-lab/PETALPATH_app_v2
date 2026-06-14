import { Router } from 'express';
import { childrenController } from './children.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Secure all endpoints in this route stack
router.use(authMiddleware as any);

router.get('/', childrenController.getAll as any);
router.get('/:id', childrenController.getById as any);
router.post('/', childrenController.create as any);
router.put('/:id', childrenController.update as any);
router.delete('/:id', childrenController.delete as any);

export { router as childrenRoutes };
