import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../../middleware/auth.middleware.js';
import { DynamicRoadmapBuilderService } from '../../application/services/dynamic-roadmap-builder.service.js';
import { LearningDebtService } from '../../application/services/learning-debt.service.js';
import { ReinforcementQueueService } from '../../application/services/reinforcement-queue.service.js';
import { RecoveryModeService } from '../../application/services/recovery-mode.service.js';
import { SessionBuilderService } from '../../application/services/session-builder.service.js';
import { RecommendationEngine } from '../../application/services/recommendation-engine.service.js';
import { ValidationError, UnauthorizedError } from '../../../../utils/errors.js';
import { ITopicStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { IKnowledgeStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { IRecoveryModeRepository } from '../../domain/repositories/repository-interfaces.js';
import {
  createRoadmapSchema,
  getRoadmapSchema,
  getRoadmapItemsSchema,
  createLearningDebtSchema,
  getLearningDebtsSchema,
  resolveDebtSchema,
  getReinforcementQueuesSchema,
  createPracticeSchema,
  getPracticesSchema,
  getRecoveryModeSchema,
  createRecoveryModeSchema,
  resolveRecoverySchema,
  getAdaptiveConstraintsSchema,
  createAdaptiveConstraintSchema,
  createSessionPlanSchema,
  getSessionPlanSchema,
  getSessionPlanByIdSchema,
  sessionPlanActionSchema,
  getSessionBlocksSchema,
  completeBlockSchema,
  skipBlockSchema,
  getNextRecommendationSchema,
  getPracticeRecommendationSchema,
  getAdaptiveRecommendationSchema,
  getRecoveryRecommendationSchema,
} from '../validators/adaptive-planning.validators.js';

export class AdaptivePlanningController {
  constructor(
    private readonly roadmapBuilder: DynamicRoadmapBuilderService,
    private readonly learningDebtService: LearningDebtService,
    private readonly reinforcementQueueService: ReinforcementQueueService,
    private readonly recoveryModeService: RecoveryModeService,
    private readonly sessionBuilder: SessionBuilderService,
    private readonly recommendationEngine: RecommendationEngine,
    private readonly topicStateRepo: ITopicStateRepository,
    private readonly knowledgeStateRepo: IKnowledgeStateRepository,
    private readonly recoveryModeRepo: IRecoveryModeRepository,
  ) {}

  // Roadmap endpoints
  async createRoadmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = createRoadmapSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid roadmap request', result.error.format());

      const roadmap = await this.roadmapBuilder.buildRoadmap(childId);
      return res.status(201).json({ success: true, data: roadmap });
    } catch (error) { next(error); }
  }

  async getRoadmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getRoadmapSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const roadmap = await this.roadmapBuilder.getRoadmap(childId);
      if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found' });

      return res.status(200).json({ success: true, data: roadmap });
    } catch (error) { next(error); }
  }

  async getRoadmapItems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getRoadmapItemsSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const roadmap = await this.roadmapBuilder.getRoadmap(childId);
      if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found' });

      const roadmapData = roadmap.roadmapJson as any;
      const items = this.flattenRoadmapItems(roadmapData, result.data.sectionType, result.data.limit, result.data.offset);

      return res.status(200).json({ success: true, data: items });
    } catch (error) { next(error); }
  }

  // Learning Debt endpoints
  async createLearningDebt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = createLearningDebtSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid debt data', result.error.format());

      const debt = await this.learningDebtService.createDebt({ ...result.data, childId });
      return res.status(201).json({ success: true, data: debt });
    } catch (error) { next(error); }
  }

  async getLearningDebts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getLearningDebtsSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const debts = await this.learningDebtService.getDebtsByChild(childId, result.data.topicId, result.data.resolved);
      return res.status(200).json({ success: true, data: debts });
    } catch (error) { next(error); }
  }

  async resolveDebt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = resolveDebtSchema.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const debt = await this.learningDebtService.resolveDebt(result.data.debtId);
      return res.status(200).json({ success: true, data: debt });
    } catch (error) { next(error); }
  }

  // Reinforcement Queue endpoints
  async getReinforcementQueues(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getReinforcementQueuesSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const queues = await this.reinforcementQueueService.getActiveQueue(childId);
      return res.status(200).json({ success: true, data: queues });
    } catch (error) { next(error); }
  }

  // Practice endpoints (unified DAILY, MASTERY, REINFORCEMENT)
  async createPractice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = createPracticeSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid data', result.error.format());

      const practice = await this.roadmapBuilder.createPractice({ ...result.data, childId });
      return res.status(201).json({ success: true, data: practice });
    } catch (error) { next(error); }
  }

  async getPractices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getPracticesSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      let practices;
      if (result.data.topicId) {
        practices = await this.roadmapBuilder.getPracticesByChildAndDateRange(childId, new Date(), new Date());
      } else if (result.data.completed !== undefined) {
        if (result.data.completed) {
          practices = await this.roadmapBuilder.getPracticesByChild(childId);
        } else {
          practices = await this.roadmapBuilder.getPendingPracticesByChild(childId);
        }
      } else if (result.data.type) {
        practices = await this.roadmapBuilder.getPracticesByChildAndType(childId, result.data.type);
      } else if (result.data.debtId) {
        practices = await this.roadmapBuilder.getPracticesByDebtId(result.data.debtId);
      } else {
        practices = await this.roadmapBuilder.getPracticesByChild(childId);
      }

      return res.status(200).json({ success: true, data: practices.slice(result.data.offset, result.data.offset + result.data.limit) });
    } catch (error) { next(error); }
  }

  // Recovery Mode endpoints
  async getRecoveryMode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getRecoveryModeSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const recovery = await this.recoveryModeService.getActiveRecoveryMode(childId);
      return res.status(200).json({ success: true, data: recovery });
    } catch (error) { next(error); }
  }

  async createRecoveryMode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = createRecoveryModeSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid data', result.error.format());

      // Fetch topic states for proper recovery evaluation
      const topicStates = await this.topicStateRepo.findByChildId(childId);
      const knowledgeStates = await this.knowledgeStateRepo.findByChildId(childId);
      
      // Calculate effort level from topic states (based on state)
      const effortLevel = topicStates.length > 0 
        ? Math.max(...topicStates.map(t => {
            switch (t.state) {
              case 'MASTERED': return 1;
              case 'STABLE': return 2;
              case 'LEARNING': return 3;
              case 'NEEDS_PRACTICE': return 4;
              case 'NEW': return 5;
              default: return 3;
            }
          })) 
        : 3;

      const recovery = await this.recoveryModeService.checkAndActivateRecovery(childId, topicStates, effortLevel);
      
      if (!recovery) {
        return res.status(200).json({ success: true, data: null, message: 'Recovery conditions not met' });
      }
      
      return res.status(201).json({ success: true, data: recovery });
    } catch (error) { next(error); }
  }

  async resolveRecovery(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = resolveRecoverySchema.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const recovery = await this.recoveryModeService.resolveRecovery(childId);
      return res.status(200).json({ success: true, data: recovery });
    } catch (error) { next(error); }
  }

  // Adaptive Constraints endpoints
  async getAdaptiveConstraints(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getAdaptiveConstraintsSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const constraints = await this.roadmapBuilder.getAdaptiveConstraints(childId, result.data.activeOnly);
      return res.status(200).json({ success: true, data: constraints });
    } catch (error) { next(error); }
  }

  async createAdaptiveConstraint(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = createAdaptiveConstraintSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid data', result.error.format());

      const constraint = await this.roadmapBuilder.createAdaptiveConstraint({ ...result.data, childId });
      return res.status(201).json({ success: true, data: constraint });
    } catch (error) { next(error); }
  }

  // Session Plan endpoints
  async createSessionPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = createSessionPlanSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid data', result.error.format());

      const roadmap = await this.roadmapBuilder.getRoadmap(childId);
      if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found' });
      
      const session = await this.sessionBuilder.generateSession(childId, roadmap);
      return res.status(201).json({ success: true, data: session });
    } catch (error) { next(error); }
  }

  async getSessionPlans(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const result = getSessionPlanSchema.safeParse(req.query);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const plans = await this.sessionBuilder.getSessionPlansByChild(childId, result.data.limit, result.data.offset);
      return res.status(200).json({ success: true, data: plans });
    } catch (error) { next(error); }
  }

  async getSessionPlanById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = getSessionPlanByIdSchema.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const plan = await this.sessionBuilder.getSessionPlanById(result.data.sessionPlanId);
      if (!plan) return res.status(404).json({ success: false, message: 'Session plan not found' });

      return res.status(200).json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async startSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = sessionPlanActionSchema.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const plan = await this.sessionBuilder.startSession(result.data.sessionPlanId);
      return res.status(200).json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async pauseSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = sessionPlanActionSchema.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const plan = await this.sessionBuilder.pauseSession(result.data.sessionPlanId);
      return res.status(200).json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async completeSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = sessionPlanActionSchema.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const plan = await this.sessionBuilder.completeSession(result.data.sessionPlanId);
      return res.status(200).json({ success: true, data: plan });
    } catch (error) { next(error); }
  }

  async getSessionBlocks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = getSessionBlocksSchema.safeParse(req.params);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const blocks = await this.sessionBuilder.getSessionBlocksBySessionPlanId(result.data.sessionPlanId);
      return res.status(200).json({ success: true, data: blocks });
    } catch (error) { next(error); }
  }

  async completeBlock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = completeBlockSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const block = await this.sessionBuilder.completeBlock(result.data.sessionPlanId, result.data.blockId);
      return res.status(200).json({ success: true, data: block });
    } catch (error) { next(error); }
  }

  async skipBlock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = skipBlockSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid parameters', result.error.format());

      const block = await this.sessionBuilder.skipBlock(result.data.sessionPlanId, result.data.blockId);
      return res.status(200).json({ success: true, data: block });
    } catch (error) { next(error); }
  }

  // Recommendation endpoints
  async getNextRecommendation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const roadmap = await this.roadmapBuilder.getRoadmap(childId);
      if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found' });
      
      const recommendation = await this.recommendationEngine.getNextActivity(childId, roadmap, 0);
      return res.status(200).json({ success: true, data: recommendation });
    } catch (error) { next(error); }
  }

  async getPracticeRecommendation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const roadmap = await this.roadmapBuilder.getRoadmap(childId);
      if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found' });
      
      const recommendation = await this.recommendationEngine.getPracticeRecommendation(childId, roadmap);
      return res.status(200).json({ success: true, data: recommendation });
    } catch (error) { next(error); }
  }

  async getAdaptiveRecommendation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const roadmap = await this.roadmapBuilder.getRoadmap(childId);
      if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found' });
      
      const recovery = await this.recoveryModeService.getActiveRecoveryMode(childId);
      const recommendation = await this.recommendationEngine.getAdaptiveRecommendation(childId, roadmap, recovery);
      return res.status(200).json({ success: true, data: recommendation });
    } catch (error) { next(error); }
  }

  async getRecoveryRecommendation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) throw new UnauthorizedError('Active child profile is not selected');

      const recovery = await this.recoveryModeService.getActiveRecoveryMode(childId);
      const roadmap = await this.roadmapBuilder.getRoadmap(childId);
      if (!roadmap) return res.status(404).json({ success: false, message: 'Roadmap not found' });
      
      const recommendation = await this.recommendationEngine.getRecoveryRecommendation(childId, roadmap);
      return res.status(200).json({ success: true, data: recommendation });
    } catch (error) { next(error); }
  }

  private flattenRoadmapItems(roadmapData: any, sectionType?: string, limit = 50, offset = 0): any[] {
    const items: any[] = [];
    for (const section of roadmapData.sections || []) {
      if (sectionType && section.type !== sectionType) continue;
      for (const item of section.items || []) {
        items.push({ ...item, sectionType: section.type });
      }
    }
    return items.slice(offset, offset + limit);
  }
}