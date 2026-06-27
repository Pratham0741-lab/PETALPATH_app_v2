import { Router } from 'express';
import { reinforcementController } from './reinforcement.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware as any);

router.post('/process', reinforcementController.processReinforcement as any);
router.get('/queue', reinforcementController.getQueue as any);
router.get('/due', reinforcementController.getDueSkills as any);
router.get('/history', reinforcementController.getHistory as any);
router.get('/events', reinforcementController.getEvents as any);

export { router as reinforcementRoutes };
