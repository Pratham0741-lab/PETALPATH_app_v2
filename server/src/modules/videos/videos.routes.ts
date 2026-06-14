import { Router } from 'express';
import { videosController } from './videos.controller.js';

const router = Router();

router.get('/', videosController.getAll);
router.get('/:id', videosController.getById);
router.post('/', videosController.create);
router.put('/:id', videosController.update);
router.delete('/:id', videosController.delete);

export { router as videosRoutes };
