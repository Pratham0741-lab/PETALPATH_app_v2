import { Router } from 'express';
import { mentorsController } from './mentors.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', mentorsController.getAll as any);
router.get('/:id', mentorsController.getById as any);

export { router as mentorsRoutes };
