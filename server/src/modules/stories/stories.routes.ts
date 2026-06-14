import { Router } from 'express';
import { storiesController } from './stories.controller.js';

const router = Router();

router.get('/', storiesController.getAll);
router.get('/:id', storiesController.getById);
router.post('/', storiesController.create);
router.put('/:id', storiesController.update);
router.delete('/:id', storiesController.delete);

export { router as storiesRoutes };
