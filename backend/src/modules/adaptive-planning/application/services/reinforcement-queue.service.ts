import { ReinforcementQueue } from '../../domain/entities/reinforcement-queue.entity.js';
import { IReinforcementQueueRepository } from '../../domain/repositories/repository-interfaces.js';
import { ReinforcementQueueStatus } from '../../domain/value-objects/planning-types.js';
import { Modality } from '../../../adaptive-learning/domain/value-objects/event-types.js';

export class ReinforcementQueueService {
  constructor(private readonly reinforcementQueueRepo: IReinforcementQueueRepository) {}

  async enqueueTopic(
    childId: string,
    topicId: string,
    masteryState: string,
    modality?: Modality
  ): Promise<any> {
    const existing = await this.reinforcementQueueRepo.findByChildAndTopic(childId, topicId, modality);
    
    if (existing) {
      if (existing.status === ReinforcementQueueStatus.COMPLETED) {
        const reactivated = existing.resume();
        return this.reinforcementQueueRepo.update(reactivated);
      }
      return existing;
    }

    const queue = ReinforcementQueue.create({
      childId,
      topicId,
      modality,
      startedAt: new Date(),
      nextReviewAt: this.calculateNextReviewDate(masteryState),
      reviewFrequency: this.calculateFrequencyDays(masteryState),
      reviewCount: 0,
      successfulReviews: 0,
      status: ReinforcementQueueStatus.ACTIVE,
      priority: 0,
    });

    return this.reinforcementQueueRepo.create(queue);
  }

  async processReview(childId: string, topicId: string, success: boolean, masteryState: string): Promise<any> {
    const queue = await this.reinforcementQueueRepo.findByChildAndTopic(childId, topicId);
    if (!queue) throw new Error('Reinforcement queue not found');

    const updated = queue.recordReview(success);
    
    if (success) {
      if (updated.successfulReviews >= this.getRequiredReviews(masteryState)) {
        const completed = updated.complete();
        return this.reinforcementQueueRepo.update(completed);
      }
    }

    return this.reinforcementQueueRepo.update(updated);
  }

  async getDueReviews(childId: string): Promise<any[]> {
    return this.reinforcementQueueRepo.findDueReviews(childId, new Date());
  }

  async getActiveQueue(childId: string): Promise<any[]> {
    return this.reinforcementQueueRepo.findActiveByChild(childId);
  }

  async pauseQueue(childId: string, topicId: string): Promise<any> {
    const queue = await this.reinforcementQueueRepo.findByChildAndTopic(childId, topicId);
    if (!queue) throw new Error('Queue not found');

    const paused = queue.pause();
    return this.reinforcementQueueRepo.update(paused);
  }

  async resumeQueue(childId: string, topicId: string): Promise<any> {
    const queue = await this.reinforcementQueueRepo.findByChildAndTopic(childId, topicId);
    if (!queue) throw new Error('Queue not found');

    const resumed = queue.resume();
    return this.reinforcementQueueRepo.update(resumed);
  }

  private calculateNextReviewDate(masteryState: string): Date {
    const now = new Date();
    const frequencyDays = this.calculateFrequencyDays(masteryState);
    return new Date(now.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
  }

  private calculateFrequencyDays(masteryState: string): number {
    const frequencies: Record<string, number> = {
      'WEAK': 1,
      'STRONG': 2,
      'MASTERED': 3,
      'NEW': 1,
      'LEARNING': 1,
      'NEEDS_PRACTICE': 1,
      'STABLE': 2,
      'REINFORCEMENT': 2,
    };
    return frequencies[masteryState] || 1;
  }

  private getRequiredReviews(masteryState: string): number {
    const required: Record<string, number> = {
      'WEAK': 3,
      'STRONG': 2,
      'MASTERED': 1,
      'NEW': 3,
      'LEARNING': 2,
      'NEEDS_PRACTICE': 3,
      'STABLE': 2,
      'REINFORCEMENT': 2,
    };
    return required[masteryState] || 2;
  }
}