import { Router } from 'express';
import { lessonsController } from './lessons.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Secure all endpoints under JWT auth
router.use(authMiddleware as any);

router.get('/', lessonsController.getAll as any);
router.get('/unlocked', lessonsController.getUnlockedLessons as any);
router.get('/:id', lessonsController.getById as any);
router.get('/:id/activities', lessonsController.getLessonActivities as any);

router.post('/', lessonsController.create as any);
router.put('/:id', lessonsController.update as any);
router.delete('/:id', lessonsController.delete as any);

export { router as lessonsRoutes };
