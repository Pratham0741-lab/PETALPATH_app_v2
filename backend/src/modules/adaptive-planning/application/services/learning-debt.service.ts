import { LearningDebt } from '../../domain/entities/learning-debt.entity.js';
import { ILearningDebtRepository } from '../../domain/repositories/repository-interfaces.js';
import { LearningDebtType } from '../../domain/value-objects/planning-types.js';
import { TopicStateType } from '../../../intelligence-core/domain/value-objects/intelligence-types.js';
import { Modality } from '../../../adaptive-learning/domain/value-objects/event-types.js';

export class LearningDebtService {
  constructor(private readonly learningDebtRepo: ILearningDebtRepository) {}

  async detectAndCreateDebts(childId: string, topicStates: any[]): Promise<any[]> {
    const debts: any[] = [];

    for (const topicState of topicStates) {
      if (topicState.state === TopicStateType.NEEDS_PRACTICE) {
        for (const [modality, state] of Object.entries(topicState.modalityStates || {})) {
          if (state === 'NEEDS_PRACTICE') {
            const existingDebts = await this.learningDebtRepo.findByChildAndTopic(childId, topicState.topicId);
            const existingModalityDebt = existingDebts.find(d => d.modality === modality && !d.resolved);

            if (!existingModalityDebt) {
              const debt = LearningDebt.create({
                childId,
                topicId: topicState.topicId,
                modality: modality as any,
                debtType: LearningDebtType.PRACTICE,
                severity: 0.8,
                description: `Modality ${modality} needs practice for topic ${topicState.topicId}`,
              });
              await this.learningDebtRepo.create(debt);
              debts.push(debt);
            }
          }
        }
      }

      if (topicState.state === TopicStateType.REINFORCEMENT) {
        const existingDebts = await this.learningDebtRepo.findByChildAndTopic(childId, topicState.topicId);
        const existingReinforcementDebt = existingDebts.find(d => d.debtType === LearningDebtType.REINFORCEMENT && !d.resolved);

        if (!existingReinforcementDebt) {
          const debt = LearningDebt.create({
            childId,
            topicId: topicState.topicId,
            debtType: LearningDebtType.REINFORCEMENT,
            severity: 0.6,
            description: `Topic ${topicState.topicId} requires reinforcement`,
          });
          await this.learningDebtRepo.create(debt);
          debts.push(debt);
        }
      }
    }

    return debts;
  }

  async resolveDebt(debtId: string): Promise<any> {
    const debt = await this.learningDebtRepo.findById(debtId);
    if (!debt) throw new Error('Debt not found');

    const resolved = debt.resolve();
    await this.learningDebtRepo.update(resolved);
    return resolved;
  }

  async getUnresolvedDebtsByChild(childId: string): Promise<any[]> {
    return this.learningDebtRepo.findUnresolvedByChildId(childId);
  }

  async getDebtsByTopic(childId: string, topicId: string): Promise<any[]> {
    return this.learningDebtRepo.findByChildAndTopic(childId, topicId);
  }

  async resolveDebtsForTopic(childId: string, topicId: string, modality?: string): Promise<number> {
    const debts = await this.learningDebtRepo.findByChildAndTopic(childId, topicId);
    let resolvedCount = 0;

    for (const debt of debts) {
      if (!debt.resolved && (!modality || debt.modality === modality)) {
        const resolved = debt.resolve();
        await this.learningDebtRepo.update(resolved);
        resolvedCount++;
      }
    }

    return resolvedCount;
  }

  async getDebtsByChild(childId: string, topicId?: string, resolved?: boolean): Promise<any[]> {
    if (topicId) {
      return this.learningDebtRepo.findByChildAndTopic(childId, topicId);
    }
    if (resolved === false) {
      return this.learningDebtRepo.findUnresolvedByChildId(childId);
    }
    return this.learningDebtRepo.findByChildId(childId);
  }

  async createDebt(data: { childId: string; topicId: string; modality?: string; debtType: any; severity: number; description: string }): Promise<any> {
    const debt = LearningDebt.create({
      childId: data.childId,
      topicId: data.topicId,
      modality: data.modality as any,
      debtType: data.debtType as LearningDebtType,
      severity: data.severity,
      description: data.description,
    });
    return this.learningDebtRepo.create(debt);
  }
}