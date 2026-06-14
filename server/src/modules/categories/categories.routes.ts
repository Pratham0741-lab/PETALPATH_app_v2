import { Router } from 'express';
import { categoriesController } from './categories.controller.js';

const router = Router();

router.get('/', categoriesController.getAll);
router.get('/:id', categoriesController.getById);
router.post('/', categoriesController.create);
router.put('/:id', categoriesController.update);
router.delete('/:id', categoriesController.delete);

export { router as categoriesRoutes };
