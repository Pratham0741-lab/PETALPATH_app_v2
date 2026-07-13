import { Router } from 'express';
import { LearningEventController } from '../controllers/learning-event.controller.js';
import { authMiddleware } from '../../../../middleware/auth.middleware.js';

export function createLearningEventRoutes(controller: LearningEventController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  router.post('/', controller.createEvent as any);
  router.get('/', controller.getEventsByChild as any);
  router.get('/session/:sessionId', controller.getEventsBySession as any);
  router.get('/activity/:activityId', controller.getEventsByActivity as any);
  router.get('/topic/:topicId', controller.getEventsByTopic as any);
  router.get('/evidence', controller.getEvidenceByChild as any);
  router.get('/evidence/session/:sessionId', controller.getEvidenceBySession as any);
  router.get('/evidence/activity/:activityId', controller.getEvidenceByActivity as any);
  router.get('/evidence/topic/:topicId', controller.getEvidenceByTopic as any);

  return router;
}