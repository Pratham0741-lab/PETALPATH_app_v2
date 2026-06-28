import { Router } from 'express';
import { lessonsController } from './lessons.controller.js';

const router = Router();

router.get('/', lessonsController.getAll);
router.get('/:id', lessonsController.getById);
router.post('/', lessonsController.create);
router.put('/:id', lessonsController.update);
router.delete('/:id', lessonsController.delete);

export { router as lessonsRoutes };
