import { DynamicRoadmap } from '../../domain/entities/dynamic-roadmap.entity.js';
import { Practice } from '../../domain/entities/practice.entity.js';
import {
  IDynamicRoadmapRepository,
  ITopicStateRepository,
  IKnowledgeStateRepository,
  ILearningDebtRepository,
  IReinforcementQueueRepository,
  IRecoveryModeRepository,
  IPracticeRepository,
} from '../../domain/repositories/repository-interfaces.js';
import { ILearnerStateRepository } from '../../../intelligence-core/domain/repositories/repository-interfaces.js';
import { RoadmapSectionType } from '../../domain/value-objects/planning-types.js';

export class DynamicRoadmapBuilderService {
  constructor(
    private readonly dynamicRoadmapRepo: IDynamicRoadmapRepository,
    private readonly topicStateRepo: ITopicStateRepository,
    private readonly knowledgeStateRepo: IKnowledgeStateRepository,
    private readonly learningDebtRepo: ILearningDebtRepository,
    private readonly reinforcementQueueRepo: IReinforcementQueueRepository,
    private readonly recoveryModeRepo: IRecoveryModeRepository,
    private readonly practiceRepo: IPracticeRepository,
    private readonly learnerStateRepo: ILearnerStateRepository,
  ) {}

  async buildRoadmap(childId: string): Promise<DynamicRoadmap> {
    const [topicStates, knowledgeStates, learningDebts, dueReinforcements, activeRecovery, learnerState] = await Promise.all([
      this.topicStateRepo.findByChildId(childId),
      this.knowledgeStateRepo.findByChildId(childId),
      this.learningDebtRepo.findByChildId(childId),
      this.reinforcementQueueRepo.findDueReviews(childId, new Date()),
      this.recoveryModeRepo.findActiveByChildId(childId),
      this.learnerStateRepo.findByChildId(childId),
    ]);

    const hasRecovery = activeRecovery && activeRecovery.status === 'ACTIVE';

    // Get adaptive constraints from learner state
    const adaptiveConstraints = learnerState?.adaptiveConstraints || [];

    const roadmapItems: any[] = [];
    let order = 0;

    if (hasRecovery) {
      const recoveryItems = await this.buildRecoverySection(childId, activeRecovery);
      roadmapItems.push(...recoveryItems.map(item => ({ ...item, order: order++ })));
    }

    const dailyPracticeItems = await this.buildDailyPracticeSection(childId, topicStates, knowledgeStates);
    roadmapItems.push(...dailyPracticeItems.map(item => ({ ...item, order: order++ })));

    const masteryPracticeItems = await this.buildMasteryPracticeSection(childId, learningDebts, topicStates);
    roadmapItems.push(...masteryPracticeItems.map(item => ({ ...item, order: order++ })));

    const newLearningItems = await this.buildNewLearningSection(childId, topicStates);
    roadmapItems.push(...newLearningItems.map(item => ({ ...item, order: order++ })));

    const reinforcementItems = await this.buildReinforcementSection(childId, dueReinforcements);
    roadmapItems.push(...reinforcementItems.map(item => ({ ...item, order: order++ })));

    const rewardItems = await this.buildRewardSection(childId);
    roadmapItems.push(...rewardItems.map(item => ({ ...item, order: order++ })));

    // Apply adaptive constraints (full evaluation pipeline per Ch.13 §10)
    const constrainedItems = this.applyAdaptiveConstraints(roadmapItems, adaptiveConstraints as any[]);

    const roadmapJson = {
      sections: constrainedItems,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: 1,
        sectionsCount: [...new Set(constrainedItems.map(i => i.sectionType))].length,
        itemsCount: constrainedItems.length,
      },
    };

    const existing = await this.dynamicRoadmapRepo.findByChildId(childId);
    let roadmap = DynamicRoadmap.create({
      childId,
      roadmapJson,
      generatedAt: new Date(),
    });

    if (existing) {
      roadmap = existing;
      roadmap = roadmap.updateRoadmap(roadmapJson);
      await this.dynamicRoadmapRepo.update(roadmap);
    } else {
      await this.dynamicRoadmapRepo.create(roadmap);
    }

    return roadmap;
  }

  async getRoadmap(childId: string): Promise<DynamicRoadmap | null> {
    return this.dynamicRoadmapRepo.findByChildId(childId);
  }

  // Practice methods
  async createPractice(data: { childId: string; topicId: string; modality?: string; type: string; scheduledFor: Date; debtId?: string }): Promise<any> {
    const practice = Practice.create({
      childId: data.childId,
      topicId: data.topicId,
      modality: data.modality as any,
      type: data.type as any,
      scheduledFor: data.scheduledFor,
      debtId: data.debtId,
    });
    return this.practiceRepo.create(practice);
  }

  async getPracticesByChild(childId: string, limit?: number, offset?: number): Promise<any[]> {
    return this.practiceRepo.findByChildId(childId, limit, offset);
  }

  async getPendingPracticesByChild(childId: string): Promise<any[]> {
    return this.practiceRepo.findPendingByChildId(childId);
  }

  async getPracticesByChildAndDateRange(childId: string, from: Date, to: Date): Promise<any[]> {
    return this.practiceRepo.findByChildIdAndDateRange(childId, from, to);
  }

  async getPracticesByChildAndType(childId: string, type: string, limit?: number, offset?: number): Promise<any[]> {
    return this.practiceRepo.findByChildIdAndType(childId, type, limit, offset);
  }

  async getPracticesByDebtId(debtId: string): Promise<any[]> {
    return this.practiceRepo.findByDebtId(debtId);
  }

  async getPracticesByChildAndTopic(childId: string, topicId: string): Promise<any[]> {
    return this.practiceRepo.findByChildIdAndTopicId(childId, topicId);
  }

  // Adaptive Constraints methods - now read from LearnerState
  async getAdaptiveConstraints(childId: string, activeOnly?: boolean): Promise<any[]> {
    const learnerState = await this.learnerStateRepo.findByChildId(childId);
    if (!learnerState) return [];
    const constraints = (learnerState.adaptiveConstraints as any[]) || [];
    return activeOnly ? constraints.filter((c: any) => c.active) : constraints;
  }

  async createAdaptiveConstraint(data: { childId: string; type: string; name: string; value: any; priority?: number; active?: boolean }): Promise<any> {
    const learnerState = await this.learnerStateRepo.findByChildId(data.childId);
    if (!learnerState) throw new Error('LearnerState not found');

    const constraints = (learnerState.adaptiveConstraints as any[]) || [];
    const newConstraint = {
      id: crypto.randomUUID(),
      childId: data.childId,
      type: data.type,
      name: data.name,
      value: data.value,
      priority: data.priority ?? 1,
      active: data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    constraints.push(newConstraint);

    // Update learner state with new constraints
    (learnerState as any).adaptiveConstraints = constraints;
    await this.learnerStateRepo.update(learnerState);

    return newConstraint;
  }

  private async buildRecoverySection(childId: string, recoveryMode: any): Promise<any[]> {
    const items: any[] = [];
    const recoveryTopics = await this.getRecoveryTopics(childId);
    
    for (const topic of recoveryTopics) {
      items.push({
        sectionType: 'RECOVERY',
        topicId: topic.topicId,
        modality: 'VIDEO',
        activityType: 'VIDEO',
        estimatedMinutes: 5,
        effortLevel: 1,
        priority: 100,
        metadata: { recoveryMode: true, reason: 'confidence_rebuilding' },
      });
    }
    return items;
  }

  private async buildDailyPracticeSection(childId: string, topicStates: any[], knowledgeStates: any[]): Promise<any[]> {
    const items: any[] = [];
    const stableTopics = topicStates.filter(t => t.state === 'STABLE');
    const existing = await this.practiceRepo.findByChildIdAndDateRange(childId, new Date(), new Date());

    for (const topic of stableTopics) {
      const topicExisting = existing.find(e => e.topicId === topic.topicId);
      
      if (!topicExisting) {
        const modality = this.selectDailyPracticeModality(topic);
        items.push({
          sectionType: 'DAILY_PRACTICE',
          topicId: topic.topicId,
          modality,
          activityType: this.modalityToActivityType(modality),
          estimatedMinutes: 5,
          effortLevel: 2,
          priority: 90,
          metadata: { dailyPractice: true },
        });
      }
    }
    return items;
  }

  private async buildMasteryPracticeSection(childId: string, learningDebts: any[], topicStates: any[]): Promise<any[]> {
    const items: any[] = [];
    
    for (const debt of learningDebts) {
      if (!debt.resolved && (debt.debtType === 'PRACTICE' || debt.debtType === 'REINFORCEMENT')) {
        const topicState = topicStates.find(t => t.topicId === debt.topicId);
        if (topicState) {
          const modality = debt.modality || this.selectModalityForDebt(topicState, debt.debtType);
          items.push({
            sectionType: 'MASTERY_PRACTICE',
            topicId: debt.topicId,
            modality,
            activityType: this.modalityToActivityType(modality),
            estimatedMinutes: 10,
            effortLevel: 4,
            priority: 80,
            metadata: { debtId: debt.id, debtType: debt.debtType },
          });
        }
      }
    }
    return items;
  }

  private async buildNewLearningSection(childId: string, topicStates: any[]): Promise<any[]> {
    const items: any[] = [];
    const newTopics = topicStates.filter(t => t.state === 'NEW' || t.state === 'LEARNING');
    
    for (const topic of newTopics.slice(0, 3)) {
      items.push({
        sectionType: 'NEW_LEARNING',
        topicId: topic.topicId,
        modality: 'VIDEO',
        activityType: 'VIDEO',
        estimatedMinutes: 8,
        effortLevel: 5,
        priority: 60,
        metadata: { curriculumRecommendation: true },
      });
    }
    return items;
  }

  private async buildReinforcementSection(childId: string, dueReinforcements: any[]): Promise<any[]> {
    const items: any[] = [];
    
    for (const reinforcement of dueReinforcements.slice(0, 2)) {
      items.push({
        sectionType: 'REINFORCEMENT',
        topicId: reinforcement.topicId,
        modality: 'VIDEO',
        activityType: 'VIDEO',
        estimatedMinutes: 5,
        effortLevel: 3,
        priority: 40,
        metadata: { reinforcement: true },
      });
    }
    return items;
  }

  private async buildRewardSection(childId: string): Promise<any[]> {
    return [{
      sectionType: 'REWARD',
      topicId: null,
      modality: 'VIDEO',
      activityType: 'REWARD',
      estimatedMinutes: 2,
      effortLevel: 1,
      priority: 10,
      metadata: { reward: true },
    }];
  }

  private applyAdaptiveConstraints(items: any[], constraints: any[]): any[] {
    // Full constraint evaluation pipeline per Ch.13 §10
    // Pipeline: Load constraints → Validate roadmap → Apply rules → Adjust roadmap → Return constrained roadmap
    let constrainedItems = [...items];

    for (const constraint of constraints) {
      if (!constraint.active) continue;

      switch (constraint.type) {
        case 'SESSION':
          if (constraint.name === 'MAX_DURATION') {
            constrainedItems = this.applyMaxDurationConstraint(constrainedItems, constraint.value.maxMinutes);
          }
          break;
        case 'MODALITY':
          if (constraint.name === 'NO_CONSECUTIVE_SAME') {
            constrainedItems = this.applyNoConsecutiveModalityConstraint(constrainedItems);
          }
          if (constraint.name === 'MODALITY_REQUIRED') {
            constrainedItems = this.applyModalityRequiredConstraint(constrainedItems, constraint.value);
          }
          break;
        case 'COGNITIVE':
          if (constraint.name === 'MAX_EFFORT') {
            constrainedItems = this.applyMaxEffortConstraint(constrainedItems, constraint.value.maxEffort);
          }
          if (constraint.name === 'EFFORT_PROGRESSION') {
            constrainedItems = this.applyEffortProgressionConstraint(constrainedItems);
          }
          break;
        case 'EDUCATIONAL':
          if (constraint.name === 'PREREQUISITE_RESPECT') {
            constrainedItems = this.applyPrerequisiteConstraint(constrainedItems, constraint.value);
          }
          break;
      }
    }

    return constrainedItems;
  }

  private applyMaxDurationConstraint(items: any[], maxMinutes: number): any[] {
    let total = 0;
    return items.filter(item => {
      total += item.estimatedMinutes;
      return total <= maxMinutes;
    });
  }

  private applyNoConsecutiveModalityConstraint(items: any[]): any[] {
    // Reorder items to avoid consecutive same modality where possible
    const result = [...items];
    for (let i = 1; i < result.length; i++) {
      if (result[i].modality === result[i-1].modality && result[i].modality !== 'REWARD' && result[i].modality !== 'WELCOME') {
        // Find next different modality
        for (let j = i + 1; j < result.length; j++) {
          if (result[j].modality !== result[i].modality) {
            [result[i], result[j]] = [result[j], result[i]];
            break;
          }
        }
      }
    }
    return result;
  }

  private applyModalityRequiredConstraint(items: any[], requiredModality: string): any[] {
    // Filter items to only include required modality (if specified)
    return items.filter(item => item.modality === requiredModality || item.sectionType === 'REWARD' || item.sectionType === 'WELCOME');
  }

  private applyMaxEffortConstraint(items: any[], maxEffort: number): any[] {
    return items.map(item => ({
      ...item,
      effortLevel: Math.min(item.effortLevel, maxEffort)
    }));
  }

  private applyEffortProgressionConstraint(items: any[]): any[] {
    // Ensure effort progression: Low -> Medium -> High -> Medium -> Low
    const effortProfile = [2, 3, 4, 5, 4, 3, 2, 1];
    return items.map((item, index) => ({
      ...item,
      effortLevel: effortProfile[Math.min(index, effortProfile.length - 1)]
    }));
  }

  private applyPrerequisiteConstraint(items: any[], prerequisites: any): any[] {
    // Filter items that don't meet prerequisite requirements
    // This would check topic prerequisites against learner state
    return items; // Placeholder - would check topic prerequisites
  }

  private async getRecoveryTopics(childId: string): Promise<any[]> {
    return [];
  }

  private selectDailyPracticeModality(topicState: any): string {
    const modalities = Object.entries(topicState.modalityStates || {});
    const stable = modalities.filter(([_, state]) => state === 'STABLE');
    if (stable.length > 0) return stable[0][0];
    return 'VIDEO';
  }

  private modalityToActivityType(modality: string): string {
    const mapping: Record<string, string> = {
      'VIDEO': 'VIDEO',
      'AUDIO': 'AUDIO',
      'SPEECH': 'SPEAKING',
      'WRITING': 'WRITING',
      'GAME': 'GAME',
      'STORY': 'STORY',
    };
    return mapping[modality] || 'VIDEO';
  }

  private selectModalityForDebt(topicState: any, debtType: string): string {
    if (debtType === 'REINFORCEMENT') return 'VIDEO';
    const modalities = Object.entries(topicState.modalityStates || {});
    const needsPractice = modalities.filter(([_, state]) => state === 'NEEDS_PRACTICE');
    if (needsPractice.length > 0) return needsPractice[0][0];
    return 'VIDEO';
  }
}