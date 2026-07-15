import { RecoveryMode } from '../../domain/entities/recovery-mode.entity.js';
import { IRecoveryModeRepository, ITopicStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { RecoveryModeStatus } from '../../domain/value-objects/planning-types.js';

export class RecoveryModeService {
  constructor(
    private readonly recoveryModeRepo: IRecoveryModeRepository,
    private readonly topicStateRepo: ITopicStateRepository,
  ) {}

  async checkAndActivateRecovery(childId: string): Promise<any | null> {
    const topicStates = await this.topicStateRepo.findByChildId(childId);
    if (!topicStates || topicStates.length === 0) {
      throw new Error('topicStates required for recovery evaluation');
    }

    const existing = await this.recoveryModeRepo.findActiveByChildId(childId);
    if (existing) return existing;

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

    const needsPracticeCount = topicStates.filter(t => t.state === 'NEEDS_PRACTICE').length;
    const weakModalityCount = topicStates.flatMap(t => 
      Object.entries(t.modalityStates || []).filter(([_, state]) => state === 'NEEDS_PRACTICE')
    ).length;

    const shouldActivate = needsPracticeCount >= 3 || 
                          weakModalityCount >= 2 ||
                          effortLevel >= 6;

    if (!shouldActivate) return null;

    const recoveryMode = RecoveryMode.create({
      childId,
      status: RecoveryModeStatus.ACTIVE,
      triggerReason: `Recovery triggered: ${needsPracticeCount} topics need practice, ${weakModalityCount} weak modalities, effort level ${effortLevel}`,
      enteredAt: new Date(),
      effortTierDrop: 2,
      minTopicsAtTier: 2,
      currentTier: Math.max(1, Math.floor(effortLevel / 1.5)),
    });

    return this.recoveryModeRepo.create(recoveryMode);
  }

  async resolveRecovery(childId: string): Promise<any> {
    const recoveryMode = await this.recoveryModeRepo.findActiveByChildId(childId);
    if (!recoveryMode) throw new Error('No active recovery mode');

    const resolved = recoveryMode.resolve();
    return this.recoveryModeRepo.update(resolved);
  }

  async checkAndIncreaseTier(childId: string, completedTopicsAtTier: number): Promise<any> {
    const recoveryMode = await this.recoveryModeRepo.findActiveByChildId(childId);
    if (!recoveryMode) return null;

    if (completedTopicsAtTier >= recoveryMode.minTopicsAtTier) {
      const increased = recoveryMode.advanceTier();
      return this.recoveryModeRepo.update(increased);
    }
    return recoveryMode;
  }

  async getActiveRecoveryMode(childId: string): Promise<any | null> {
    return this.recoveryModeRepo.findActiveByChildId(childId);
  }

  async getEffortConstraints(childId: string): Promise<{ maxEffort: number; preferredModality: string | null } | null> {
    const recoveryMode = await this.recoveryModeRepo.findActiveByChildId(childId);
    if (!recoveryMode) return null;

    const maxEffort = Math.max(1, recoveryMode.currentTier);
    return {
      maxEffort,
      preferredModality: 'VIDEO',
    };
  }
}