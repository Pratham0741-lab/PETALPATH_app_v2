import { ReinforcementQueue } from '../../domain/entities/reinforcement-queue.entity.js';
import { IReinforcementQueueRepository } from '../../domain/repositories/repository-interfaces.js';
import { ReinforcementQueueStatus } from '../../domain/value-objects/planning-types.js';
import { Modality } from '../../../adaptive-learning/domain/value-objects/event-types.js';
import { cadenceDaysFor, nextReviewDateFor } from '../../../mastery/review-cadence.js';

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

  /**
   * The third copy of the cadence table used to live here, as a private literal
   * map plus a `now + N × 86_400_000`. `/v1/adaptive-planning` is mounted, so it
   * was reachable — two modules answering "when does this come back?" with
   * different code. Both now delegate to `modules/mastery/review-cadence.ts`,
   * which also schedules to the start of a local day.
   *
   * This module's own status vocabulary (`NEEDS_PRACTICE`, `STABLE`,
   * `REINFORCEMENT`) is listed in `unified.review.cadenceDaysByState` alongside
   * the `MasteryState` values, so nothing changes for those callers.
   */
  private calculateNextReviewDate(masteryState: string): Date {
    return nextReviewDateFor(masteryState).nextReviewDate;
  }

  private calculateFrequencyDays(masteryState: string): number {
    return cadenceDaysFor(masteryState);
  }

  private getRequiredReviews(masteryState: string): number {
    /*
     * Worst bands need the most passes. LEARNING sits *below* WEAK — under 40,
     * against WEAK's 40-59 — so giving it 2 where WEAK got 3 asked for less
     * practice on the skills that needed most. It now matches WEAK, which is
     * also what the cadence table says about the pair: both come back tomorrow.
     */
    const required: Record<string, number> = {
      'LEARNING': 3,
      'WEAK': 3,
      'STRONG': 2,
      'MASTERED': 1,
      'NEW': 3,
      'NEEDS_PRACTICE': 3,
      'STABLE': 2,
      'REINFORCEMENT': 2,
    };
    return required[masteryState] || 2;
  }
}