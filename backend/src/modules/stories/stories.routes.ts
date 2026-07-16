import { Router } from 'express';
import { storiesController } from './stories.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.get('/', storiesController.list as any);
router.get('/:id', storiesController.getById as any);
router.get('/:id/progress', storiesController.getProgress as any);
router.post('/:id/start', storiesController.start as any);
router.post('/:id/page', storiesController.page as any);
router.post('/:id/complete', storiesController.complete as any);

export { router as storiesRoutes };
