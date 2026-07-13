import { Router } from 'express';
import { ClassificationEngineController } from '../controllers/classification-engine.controller.js';
import { authMiddleware } from '../../../../middleware/auth.middleware.js';

export function createClassificationEngineRoutes(controller: ClassificationEngineController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  router.post('/classify', controller.classify as any);
  router.get('/result', controller.getClassificationResult as any);

  return router;
}