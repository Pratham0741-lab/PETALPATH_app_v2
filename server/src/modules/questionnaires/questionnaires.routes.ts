import { Router } from 'express';
import { questionnairesController } from './questionnaires.controller.js';

const router = Router();

router.get('/', questionnairesController.getAll);
router.get('/:id', questionnairesController.getById);
router.post('/', questionnairesController.create);
router.put('/:id', questionnairesController.update);
router.delete('/:id', questionnairesController.delete);

export { router as questionnairesRoutes };
