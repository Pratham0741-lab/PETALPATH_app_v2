import { Router } from 'express';
import { sessionController } from './session.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware as any);

router.post('/generate', sessionController.generateSession as any);
router.get('/today', sessionController.getTodaySession as any);
router.get('/history', sessionController.getHistory as any);
router.get('/events', sessionController.getEvents as any);
router.get('/:id', sessionController.getSessionById as any);

router.post('/start', sessionController.startSession as any);
router.post('/pause', sessionController.pauseSession as any);
router.post('/resume', sessionController.resumeSession as any);
router.post('/complete', sessionController.completeSession as any);
router.post('/abandon', sessionController.abandonSession as any);

router.post('/:id/block/complete', sessionController.completeBlock as any);
router.post('/:id/block/skip', sessionController.skipBlock as any);

export { router as sessionRoutes };
