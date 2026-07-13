import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth.middleware.js';

export function createAdaptivePlanningRoutes(controller: any): any {
  const router = Router();

  router.use(authMiddleware as any);

  // Roadmap endpoints
  router.post('/roadmap', (req, res, next) => controller.createRoadmap(req, res, next));
  router.get('/roadmap', (req, res, next) => controller.getRoadmap(req, res, next));
  router.get('/roadmap/items', (req, res, next) => controller.getRoadmapItems(req, res, next));

  // Learning Debt endpoints
  router.post('/learning-debts', (req, res, next) => controller.createLearningDebt(req, res, next));
  router.get('/learning-debts', (req, res, next) => controller.getLearningDebts(req, res, next));
  router.post('/learning-debts/:debtId/resolve', (req, res, next) => controller.resolveDebt(req, res, next));

  // Reinforcement Queue endpoints
  router.get('/reinforcement-queues', (req, res, next) => controller.getReinforcementQueues(req, res, next));

  // Practice endpoints (unified DAILY, MASTERY, REINFORCEMENT)
  router.post('/practices', (req, res, next) => controller.createPractice(req, res, next));
  router.get('/practices', (req, res, next) => controller.getPractices(req, res, next));

  // Recovery Mode endpoints
  router.get('/recovery-mode', (req, res, next) => controller.getRecoveryMode(req, res, next));
  router.post('/recovery-mode', (req, res, next) => controller.createRecoveryMode(req, res, next));
  router.post('/recovery-mode/resolve', (req, res, next) => controller.resolveRecovery(req, res, next));

  // Adaptive Constraints endpoints
  router.get('/adaptive-constraints', (req, res, next) => controller.getAdaptiveConstraints(req, res, next));
  router.post('/adaptive-constraints', (req, res, next) => controller.createAdaptiveConstraint(req, res, next));

  // Session Plan endpoints
  router.post('/session-plans', (req, res, next) => controller.createSessionPlan(req, res, next));
  router.get('/session-plans', (req, res, next) => controller.getSessionPlans(req, res, next));
  router.get('/session-plans/:sessionPlanId', (req, res, next) => controller.getSessionPlanById(req, res, next));
  router.post('/session-plans/:sessionPlanId/start', (req, res, next) => controller.startSession(req, res, next));
  router.post('/session-plans/:sessionPlanId/pause', (req, res, next) => controller.pauseSession(req, res, next));
  router.post('/session-plans/:sessionPlanId/complete', (req, res, next) => controller.completeSession(req, res, next));
  router.get('/session-plans/:sessionPlanId/blocks', (req, res, next) => controller.getSessionBlocks(req, res, next));
  router.post('/session-plans/:sessionPlanId/blocks/:blockId/complete', (req, res, next) => controller.completeBlock(req, res, next));
  router.post('/session-plans/:sessionPlanId/blocks/:blockId/skip', (req, res, next) => controller.skipBlock(req, res, next));

  // Recommendation endpoints
  router.get('/recommendations/next', (req, res, next) => controller.getNextRecommendation(req, res, next));
  router.get('/recommendations/practice', (req, res, next) => controller.getPracticeRecommendation(req, res, next));
  router.get('/recommendations/adaptive', (req, res, next) => controller.getAdaptiveRecommendation(req, res, next));
  router.get('/recommendations/recovery', (req, res, next) => controller.getRecoveryRecommendation(req, res, next));

  return router;
}