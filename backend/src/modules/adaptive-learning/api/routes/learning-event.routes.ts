import { Router } from 'express';
import { LearningEventController } from '../controllers/learning-event.controller.js';
import { authMiddleware } from '../../../../middleware/auth.middleware.js';

export function createLearningEventRoutes(controller: LearningEventController): Router {
  const router = Router();

  router.use(authMiddleware as any);

  router.post('/', controller.createEvent.bind(controller) as any);
  router.get('/', controller.getEventsByChild.bind(controller) as any);
  router.get('/session/:sessionId', controller.getEventsBySession.bind(controller) as any);
  router.get('/activity/:activityId', controller.getEventsByActivity.bind(controller) as any);
  router.get('/topic/:topicId', controller.getEventsByTopic.bind(controller) as any);
  router.get('/evidence', controller.getEvidenceByChild.bind(controller) as any);
  router.get('/evidence/session/:sessionId', controller.getEvidenceBySession.bind(controller) as any);
  router.get('/evidence/activity/:activityId', controller.getEvidenceByActivity.bind(controller) as any);
  router.get('/evidence/topic/:topicId', controller.getEvidenceByTopic.bind(controller) as any);

  return router;
}