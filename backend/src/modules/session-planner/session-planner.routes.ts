import { Router } from 'express';
import { sessionPlannerController } from './session-planner.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.post('/generate', sessionPlannerController.generate as any);
router.get('/plans', sessionPlannerController.listPlans as any);
router.get('/plan/:id', sessionPlannerController.getPlan as any);
router.get('/sessions', sessionPlannerController.listSessions as any);
router.get('/session/:id', sessionPlannerController.getSession as any);
router.post('/start', sessionPlannerController.start as any);
router.post('/complete', sessionPlannerController.complete as any);
router.post('/abandon', sessionPlannerController.abandon as any);

export { router as sessionPlannerRoutes };
