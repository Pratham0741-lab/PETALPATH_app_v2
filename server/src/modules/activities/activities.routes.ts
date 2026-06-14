import { Router } from 'express';
import { activitiesController } from './activities.controller.js';

const router = Router();

router.get('/', activitiesController.getAll);
router.get('/:id', activitiesController.getById);
router.post('/', activitiesController.create);
router.put('/:id', activitiesController.update);
router.delete('/:id', activitiesController.delete);

export { router as activitiesRoutes };
