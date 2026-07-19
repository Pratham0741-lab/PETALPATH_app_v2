import { Router } from 'express';
import { activitiesController } from './activities.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', activitiesController.getAll as any);
router.get('/:id', activitiesController.getById as any);
router.post('/', activitiesController.create as any);
router.put('/:id', activitiesController.update as any);
router.delete('/:id', activitiesController.delete as any);

export { router as activitiesRoutes };
