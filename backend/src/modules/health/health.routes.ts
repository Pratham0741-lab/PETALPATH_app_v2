import { Router } from 'express';
import { healthController } from './health.controller.js';

const router = Router();

router.get('/live', healthController.liveness);
router.get('/ready', healthController.readiness);
router.get('/', healthController.full);

export { router as healthRoutes };
