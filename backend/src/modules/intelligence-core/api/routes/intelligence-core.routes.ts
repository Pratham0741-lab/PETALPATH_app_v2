import { Router } from 'express';
import { IntelligenceCoreController } from '../controllers/intelligence-core.controller.js';
import { authMiddleware } from '../../../../middleware/auth.middleware.js';

export function createIntelligenceCoreRoutes(controller: IntelligenceCoreController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  // Observation Engine
  router.post('/observe', controller.observeEvent as any);
  router.get('/topic-states', controller.getTopicStates as any);
  router.get('/knowledge-states', controller.getKnowledgeStates as any);

  // Classification Engine
  router.post('/classify', controller.classifyChild as any);

  return router;
}