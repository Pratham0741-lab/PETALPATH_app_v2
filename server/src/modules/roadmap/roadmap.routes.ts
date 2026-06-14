import { Router } from 'express';
import { roadmapController } from './roadmap.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, roadmapController.getRoadmap);

export { router as roadmapRoutes };
