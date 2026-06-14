import { Router } from 'express';
import { usersController } from './users.controller.js';

const router = Router();

router.get('/', usersController.getAll);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.delete('/:id', usersController.delete);

export { router as usersRoutes };
