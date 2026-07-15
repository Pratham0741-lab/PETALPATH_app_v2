import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild } from '../helpers/factories.js';
import '../helpers/setup.js';
import { RecoveryMode } from '../../modules/adaptive-planning/domain/entities/recovery-mode.entity.js';
import { RecoveryModeRepository } from '../../modules/adaptive-planning/infrastructure/repositories/recovery-mode.repository.js';
import { RecoveryModeService } from '../../modules/adaptive-planning/application/services/recovery-mode.service.js';
import { RecoveryModeStatus } from '../../modules/adaptive-planning/domain/value-objects/planning-types.js';
import { TopicStateRepository } from '../../modules/intelligence-core/infrastructure/repositories/topic-state.repository.js';
import { TopicState } from '../../modules/intelligence-core/domain/entities/topic-state.entity.js';
import { TopicStateType, ModalityStateType } from '../../modules/intelligence-core/domain/value-objects/intelligence-types.js';

describe('Recovery Mode - Integration Tests', () => {
  const repo = new RecoveryModeRepository();

  describe('RecoveryMode Repository CRUD', () => {
    it('should create a recovery mode', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'low_performance',
        enteredAt: now,
        effortTierDrop: 1,
        minTopicsAtTier: 3,
        currentTier: 1,
      });

      const created = await repo.create(rm);
      expect(created).toBeDefined();
      expect(created.childId).toBe(child.id);
      expect(created.status).toBe(RecoveryModeStatus.ACTIVE);
      expect(created.triggerReason).toBe('low_performance');
      expect(created.currentTier).toBe(1);
    });

    it('should find recovery mode by childId', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'find_by_child',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      await repo.create(rm);
      const found = await repo.findByChildId(child.id);
      expect(found).toBeDefined();
      expect(found!.childId).toBe(child.id);
      expect(found!.triggerReason).toBe('find_by_child');
    });

    it('should update a recovery mode', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'initial_trigger',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      const created = await repo.create(rm);
      const resolved = created.resolve();
      const updated = await repo.update(resolved);

      expect(updated.status).toBe(RecoveryModeStatus.RESOLVED);
      expect(updated.resolvedAt).toBeDefined();
    });

    it('should return null for non-existent childId', async () => {
      const found = await repo.findByChildId('non-existent-child');
      expect(found).toBeNull();
    });
  });

  describe('Recovery mode enable with trigger reason', () => {
    it('should create recovery mode with ACTIVE status and store triggerReason', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();
      const trigger = 'Excessive practice needs detected: 4 topics in NEEDS_PRACTICE';

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: trigger,
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      const created = await repo.create(rm);
      expect(created.status).toBe(RecoveryModeStatus.ACTIVE);
      expect(created.triggerReason).toBe(trigger);
      expect(created.enteredAt).toBeDefined();
      expect(created.enteredAt.getTime()).toBeCloseTo(now.getTime(), -2);
    });
  });

  describe('Recovery mode status transitions', () => {
    it('should transition from ACTIVE to RESOLVED and set resolvedAt', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'needs_improvement',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      const created = await repo.create(rm);
      const resolved = created.resolve();
      const updated = await repo.update(resolved);

      expect(updated.status).toBe(RecoveryModeStatus.RESOLVED);
      expect(updated.resolvedAt).toBeDefined();
      expect(updated.resolvedAt!.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });

    it('should transition from ACTIVE to ESCALATED via direct update', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'persistent_issues',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      const created = await repo.create(rm);
      const escalated = new RecoveryMode({
        id: created.id,
        childId: created.childId,
        status: RecoveryModeStatus.ESCALATED,
        triggerReason: created.triggerReason,
        enteredAt: created.enteredAt,
        resolvedAt: undefined,
        effortTierDrop: created.effortTierDrop,
        minTopicsAtTier: created.minTopicsAtTier,
        currentTier: created.currentTier,
        createdAt: created.createdAt,
        updatedAt: new Date(),
      });

      const updated = await repo.update(escalated);
      expect(updated.status).toBe(RecoveryModeStatus.ESCALATED);
    });
  });

  describe('Child has only one recovery mode', () => {
    it('should enforce @@unique([childId]) constraint preventing duplicates', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'first',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      await repo.create(rm);

      const rm2 = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.RESOLVED,
        triggerReason: 'second',
        enteredAt: new Date(),
        effortTierDrop: 1,
        minTopicsAtTier: 3,
        currentTier: 1,
      });

      await expect(repo.create(rm2)).rejects.toThrow();
    });
  });

  describe('Find active recovery', () => {
    it('should find active recovery by childId and ACTIVE status', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'active_test',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      await repo.create(rm);
      const active = await repo.findActiveByChildId(child.id);
      expect(active).toBeDefined();
      expect(active!.status).toBe(RecoveryModeStatus.ACTIVE);
      expect(active!.childId).toBe(child.id);
    });

    it('should return null when no active recovery exists', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.RESOLVED,
        triggerReason: 'already_resolved',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      await repo.create(rm);
      const active = await repo.findActiveByChildId(child.id);
      expect(active).toBeNull();
    });
  });

  describe('Effort tier changes', () => {
    it('should update currentTier and effortTierDrop and persist to DB', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'tier_test',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      const created = await repo.create(rm);

      const advanced = created.advanceTier();
      expect(advanced.currentTier).toBe(2);
      const updated = await repo.update(advanced);
      expect(updated.currentTier).toBe(2);
      expect(updated.effortTierDrop).toBe(2);

      const refetched = await repo.findByChildId(child.id);
      expect(refetched).toBeDefined();
      expect(refetched!.currentTier).toBe(2);
    });
  });

  describe('Cascade delete', () => {
    it('should delete recovery mode when child is deleted', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const now = new Date();

      const rm = RecoveryMode.create({
        childId: child.id,
        status: RecoveryModeStatus.ACTIVE,
        triggerReason: 'cascade_test',
        enteredAt: now,
        effortTierDrop: 2,
        minTopicsAtTier: 2,
        currentTier: 1,
      });

      await repo.create(rm);

      await prisma.child.delete({ where: { id: child.id } });

      const found = await repo.findByChildId(child.id);
      expect(found).toBeNull();
    });
  });

  describe('RecoveryModeService', () => {
    it('should return null from getActiveRecoveryMode for child without recovery', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicStateRepo = new TopicStateRepository();
      const service = new RecoveryModeService(repo, topicStateRepo);

      const result = await service.getActiveRecoveryMode(child.id);
      expect(result).toBeNull();
    });

    it('should return null from getEffortConstraints when no active recovery', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicStateRepo = new TopicStateRepository();
      const service = new RecoveryModeService(repo, topicStateRepo);

      const constraints = await service.getEffortConstraints(child.id);
      expect(constraints).toBeNull();
    });

    it('should activate recovery when checkAndActivateRecovery detects needs', async () => {
      const user = await createTestUser();
      const child = await createTestChild(user.id);
      const topicStateRepo = new TopicStateRepository();
      const service = new RecoveryModeService(repo, topicStateRepo);

      const now = new Date();
      for (let i = 0; i < 3; i++) {
        await topicStateRepo.create(TopicState.create({
          childId: child.id,
          topicId: crypto.randomUUID(),
          state: TopicStateType.NEEDS_PRACTICE,
          modalityStates: { VIDEO: ModalityStateType.NEEDS_PRACTICE },
          enteredAt: now,
          lastTransitionAt: now,
        }));
      }

      const result = await service.checkAndActivateRecovery(child.id);
      expect(result).toBeDefined();
      expect(result.status).toBe(RecoveryModeStatus.ACTIVE);
      expect(result.triggerReason).toContain('Recovery triggered');
    });
  });
});
