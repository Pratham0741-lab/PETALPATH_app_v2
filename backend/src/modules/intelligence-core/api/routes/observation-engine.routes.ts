import { Router } from 'express';
import { ObservationEngineController } from '../controllers/observation-engine.controller.js';
import { authMiddleware } from '../../../../middleware/auth.middleware.js';

export function createObservationEngineRoutes(controller: ObservationEngineController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  router.post('/observe', controller.observe as any);
  router.get('/topic-states', controller.getTopicStates as any);

  return router;
}