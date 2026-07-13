import { Router } from 'express';
import { EvidenceProcessorController } from '../controllers/evidence-processor.controller.js';
import { authMiddleware } from '../../../../middleware/auth.middleware.js';

export function createEvidenceProcessorRoutes(controller: EvidenceProcessorController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  router.post('/process', controller.process as any);
  router.get('/metric-snapshots', controller.getMetricSnapshots as any);

  return router;
}