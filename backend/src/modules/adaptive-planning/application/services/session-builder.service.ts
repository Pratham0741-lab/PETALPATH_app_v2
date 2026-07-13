import { SessionPlan, SessionStatus } from '../../domain/entities/session-plan.entity.js';
import { SessionBlock, SessionBlockType, SessionBlockStatus } from '../../domain/entities/session-block.entity.js';
import { ISessionPlanRepository } from '../../domain/repositories/repository-interfaces.js';
import { ISessionBlockRepository } from '../../domain/repositories/repository-interfaces.js';
import { DynamicRoadmap } from '../../domain/entities/dynamic-roadmap.entity.js';
import { RoadmapSectionType, ActivityType, DifficultyLevel } from '../../domain/value-objects/planning-types.js';

export class SessionBuilderService {
  constructor(
    private readonly sessionPlanRepo: ISessionPlanRepository,
    private readonly sessionBlockRepo: ISessionBlockRepository,
  ) {}

  async generateSession(
    childId: string,
    roadmap: DynamicRoadmap,
    recoveryMode?: any,
    adaptiveConstraints: any[] = []
  ): Promise<SessionPlan> {
    const blocks = await this.expandRoadmapItems(roadmap, recoveryMode);
    const constrainedBlocks = this.applyConstraints(blocks, adaptiveConstraints, recoveryMode);
    const balancedBlocks = this.balanceEffortAndModality(constrainedBlocks);
    const validatedBlocks = this.validateSession(balancedBlocks);
    const durationMinutes = validatedBlocks.reduce((sum, b) => sum + b.estimatedMinutes, 0);
    
    const sessionPlan = SessionPlan.create({
      childId,
      durationMinutes,
      status: SessionStatus.GENERATED,
    });

    let order = 0;
    for (const block of validatedBlocks) {
      const sessionBlock = SessionBlock.create({
        sessionPlanId: sessionPlan.id,
        type: block.type as SessionBlockType,
        topicId: block.topicId,
        modality: block.modality,
        activityType: block.activityType as ActivityType,
        difficulty: block.difficulty as DifficultyLevel,
        estimatedMinutes: block.estimatedMinutes,
        effortLevel: block.effortLevel,
        order: order++,
        isReinforcement: block.type === 'REINFORCEMENT',
        metadata: block.metadata,
        status: SessionBlockStatus.PENDING,
      });
      await this.sessionBlockRepo.create(sessionBlock);
    }

    const savedPlan = await this.sessionPlanRepo.create(sessionPlan);
    return savedPlan;
  }

  async startSession(sessionPlanId: string): Promise<SessionPlan> {
    const sessionPlan = await this.sessionPlanRepo.findById(sessionPlanId);
    if (!sessionPlan) throw new Error('Session plan not found');
    
    const started = sessionPlan.start();
    const updated = await this.sessionPlanRepo.update(started);
    
    return updated;
  }

  async pauseSession(sessionPlanId: string): Promise<SessionPlan> {
    const sessionPlan = await this.sessionPlanRepo.findById(sessionPlanId);
    if (!sessionPlan) throw new Error('Session plan not found');
    
    const paused = sessionPlan.pause();
    const updated = await this.sessionPlanRepo.update(paused);
    
    return updated;
  }

  async completeSession(sessionPlanId: string): Promise<SessionPlan> {
    const sessionPlan = await this.sessionPlanRepo.findById(sessionPlanId);
    if (!sessionPlan) throw new Error('Session plan not found');
    
    const completed = sessionPlan.complete();
    const updated = await this.sessionPlanRepo.update(completed);
    
    return updated;
  }

  async completeBlock(sessionPlanId: string, blockId: string): Promise<any> {
    const block = await this.sessionBlockRepo.findById(blockId);
    if (!block) throw new Error('Block not found');
    
    const completed = block.complete();
    return this.sessionBlockRepo.update(completed);
  }

  async skipBlock(sessionPlanId: string, blockId: string): Promise<any> {
    const block = await this.sessionBlockRepo.findById(blockId);
    if (!block) throw new Error('Block not found');
    
    const skipped = block.skip();
    return this.sessionBlockRepo.update(skipped);
  }

  async getSessionPlansByChild(childId: string, limit?: number, offset?: number): Promise<any[]> {
    return this.sessionPlanRepo.findByChildId(childId, limit, offset);
  }

  async getSessionPlanById(sessionPlanId: string): Promise<any | null> {
    return this.sessionPlanRepo.findById(sessionPlanId);
  }

  async getSessionBlocksBySessionPlanId(sessionPlanId: string): Promise<any[]> {
    return this.sessionBlockRepo.findBySessionPlanId(sessionPlanId);
  }

  private async expandRoadmapItems(roadmap: DynamicRoadmap, recoveryMode: any): Promise<any[]> {
    const roadmapData = roadmap.roadmapJson as any;
    const items: any[] = [];

    for (const section of roadmapData.sections || []) {
      for (const item of section.items || []) {
        items.push({
          ...item,
          type: this.mapSectionTypeToBlockType(section.type),
          isReinforcement: section.type === RoadmapSectionType.REINFORCEMENT,
        });
      }
    }

    return items;
  }

  private mapSectionTypeToBlockType(sectionType: string): string {
    const mapping: Record<string, string> = {
      'RECOVERY': SessionBlockType.RECOVERY,
      'DAILY_PRACTICE': SessionBlockType.DAILY_PRACTICE,
      'MASTERY_PRACTICE': SessionBlockType.MASTERY_PRACTICE,
      'NEW_LEARNING': SessionBlockType.NEW_LEARNING,
      'REINFORCEMENT': SessionBlockType.REINFORCEMENT,
      'REWARD': SessionBlockType.REWARD,
    };
    return mapping[sectionType] || SessionBlockType.NEW_LEARNING;
  }

  private applyConstraints(blocks: any[], constraints: any[], recoveryMode: any): any[] {
    let result = [...blocks];

    if (recoveryMode) {
      result = this.applyRecoveryConstraints(result, recoveryMode);
    }

    for (const constraint of constraints) {
      if (!constraint.active) continue;
      result = this.applyConstraint(result, constraint);
    }

    return result;
  }

  private applyRecoveryConstraints(blocks: any[], recoveryMode: any): any[] {
    return blocks.map(block => ({
      ...block,
      effortLevel: Math.min(block.effortLevel, recoveryMode.currentTier || 3),
    }));
  }

  private applyConstraint(blocks: any[], constraint: any): any[] {
    const value = constraint.value;
    
    switch (constraint.type) {
      case 'SESSION':
        if (constraint.name === 'MAX_DURATION') {
          let total = 0;
          return blocks.filter(block => {
            total += block.estimatedMinutes;
            return total <= value.maxMinutes;
          });
        }
        break;
      case 'MODALITY':
        if (constraint.name === 'NO_CONSECUTIVE_SAME') {
        }
        break;
      case 'COGNITIVE':
        if (constraint.name === 'MAX_EFFORT') {
          return blocks.map(b => ({
            ...b,
            effortLevel: Math.min(b.effortLevel, value.maxEffort)
          }));
        }
        break;
    }
    return blocks;
  }

  private balanceEffortAndModality(blocks: any[]): any[] {
    const effortProfile = [2, 3, 4, 5, 4, 3, 2, 1];
    const modalityOrder = ['VIDEO', 'AUDIO', 'SPEAKING', 'WRITING', 'GAME', 'STORY'];
    let modalityIndex = 0;

    return blocks.map((block, index) => {
      const effortIndex = Math.min(index, effortProfile.length - 1);
      const effortLevel = effortProfile[effortIndex];

      let modality = blocks[index].modality;
      if (!modality) {
        modality = modalityOrder[modalityIndex % modalityOrder.length];
        modalityIndex++;
      }

      return {
        ...block,
        effortLevel,
        modality,
      };
    });
  }

  private validateSession(blocks: any[]): any[] {
    const totalMinutes = blocks.reduce((sum, b) => sum + b.estimatedMinutes, 0);
    if (totalMinutes > 45) {
      return this.trimToDuration(blocks, 45);
    }

    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i].modality === blocks[i-1].modality && 
          blocks[i].modality !== 'REWARD' && blocks[i].modality !== 'WELCOME') {
        for (let j = i + 1; j < blocks.length; j++) {
          if (blocks[j].modality !== blocks[i].modality) {
            [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
            break;
          }
        }
      }
    }

    return blocks;
  }

  private trimToDuration(blocks: any[], maxMinutes: number): any[] {
    let total = 0;
    const result = [];
    for (const block of blocks) {
      if (total + block.estimatedMinutes <= maxMinutes) {
        result.push(block);
        total += block.estimatedMinutes;
      }
    }
    return result;
  }
}