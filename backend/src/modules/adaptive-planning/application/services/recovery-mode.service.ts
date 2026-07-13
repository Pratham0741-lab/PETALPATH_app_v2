import { RecoveryMode } from '../../domain/entities/recovery-mode.entity.js';
import { IRecoveryModeRepository } from '../../domain/repositories/repository-interfaces.js';
import { RecoveryModeStatus } from '../../domain/value-objects/planning-types.js';

export class RecoveryModeService {
  constructor(
    private readonly recoveryModeRepo: IRecoveryModeRepository,
  ) {}

  async checkAndActivateRecovery(childId: string, topicStates: any[], effortLevel: number): Promise<any | null> {
    if (!topicStates || topicStates.length === 0) {
      throw new Error('topicStates required for recovery evaluation');
    }

    const existing = await this.recoveryModeRepo.findActiveByChildId(childId);
    if (existing) return existing;

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