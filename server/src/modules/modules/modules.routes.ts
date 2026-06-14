import { Router } from 'express';
import { modulesController } from './modules.controller.js';

const router = Router();

router.get('/', modulesController.getAll);
router.get('/:id', modulesController.getById);
router.post('/', modulesController.create);
router.put('/:id', modulesController.update);
router.delete('/:id', modulesController.delete);

export { router as modulesRoutes };
