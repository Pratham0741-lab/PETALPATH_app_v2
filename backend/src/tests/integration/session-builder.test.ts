import { prisma } from '../../config/database.js';
import { createTestUser, createTestChild } from '../helpers/factories.js';
import '../helpers/setup.js';

import { SessionPlanRepository } from '../../modules/adaptive-planning/infrastructure/repositories/session-plan.repository.js';
import { SessionBlockRepository } from '../../modules/adaptive-planning/infrastructure/repositories/session-block.repository.js';
import { SessionPlan, SessionStatus } from '../../modules/adaptive-planning/domain/entities/session-plan.entity.js';
import { SessionBlock, SessionBlockType, SessionBlockStatus } from '../../modules/adaptive-planning/domain/entities/session-block.entity.js';
import { ActivityType, DifficultyLevel } from '../../modules/adaptive-planning/domain/value-objects/planning-types.js';

function createSessionBlockData(sessionPlanId: string, overrides: Partial<{
  type: SessionBlockType;
  activityType: ActivityType;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  effortLevel: number;
  order: number;
  status: SessionBlockStatus;
  isReinforcement: boolean;
  topicId: string;
  modality: string;
  metadata: Record<string, unknown>;
}> = {}) {
  return {
    sessionPlanId,
    type: overrides.type ?? SessionBlockType.DAILY_PRACTICE,
    activityType: overrides.activityType ?? ActivityType.VIDEO,
    difficulty: overrides.difficulty ?? DifficultyLevel.EASY,
    estimatedMinutes: overrides.estimatedMinutes ?? 10,
    effortLevel: overrides.effortLevel ?? 1,
    order: overrides.order ?? 1,
    status: overrides.status ?? SessionBlockStatus.PENDING,
    isReinforcement: overrides.isReinforcement ?? false,
    ...(overrides.topicId ? { topicId: overrides.topicId } : {}),
    ...(overrides.modality ? { modality: overrides.modality } : {}),
    ...(overrides.metadata ? { metadata: overrides.metadata } : {}),
  };
}

describe('SessionPlan Entity', () => {
  it('creates with default GENERATED status', () => {
    const plan = SessionPlan.create({ childId: crypto.randomUUID(), durationMinutes: 30 });
    expect(plan.status).toBe(SessionStatus.GENERATED);
    expect(plan.durationMinutes).toBe(30);
    expect(plan.id).toBeDefined();
    expect(plan.sessionBlocks).toEqual([]);
  });

  it('transitions through status lifecycle', () => {
    const plan = SessionPlan.create({ childId: crypto.randomUUID(), durationMinutes: 30 });
    expect(plan.status).toBe(SessionStatus.GENERATED);

    const started = plan.start();
    expect(started.status).toBe(SessionStatus.STARTED);
    expect(started.startedAt).toBeDefined();

    const paused = started.pause();
    expect(paused.status).toBe(SessionStatus.PAUSED);

    const resumed = paused.resume();
    expect(resumed.status).toBe(SessionStatus.STARTED);

    const completed = resumed.complete();
    expect(completed.status).toBe(SessionStatus.COMPLETED);
    expect(completed.completedAt).toBeDefined();

    const abandoned = plan.abandon();
    expect(abandoned.status).toBe(SessionStatus.ABANDONED);
  });

  it('preserves childId across transitions', () => {
    const childId = crypto.randomUUID();
    const plan = SessionPlan.create({ childId, durationMinutes: 20 });
    const completed = plan.complete();
    expect(completed.childId).toBe(childId);
  });
});

describe('SessionBlock Entity', () => {
  it('creates with default PENDING status', () => {
    const block = SessionBlock.create(createSessionBlockData(crypto.randomUUID()));
    expect(block.status).toBe(SessionBlockStatus.PENDING);
    expect(block.id).toBeDefined();
  });

  it('transitions through block statuses', () => {
    const block = SessionBlock.create(createSessionBlockData(crypto.randomUUID()));
    expect(block.status).toBe(SessionBlockStatus.PENDING);

    const started = block.start();
    expect(started.status).toBe(SessionBlockStatus.IN_PROGRESS);

    const completed = started.complete();
    expect(completed.status).toBe(SessionBlockStatus.COMPLETED);

    const skipped = block.skip();
    expect(skipped.status).toBe(SessionBlockStatus.SKIPPED);
  });

  it('preserves properties across transitions', () => {
    const sessionPlanId = crypto.randomUUID();
    const block = SessionBlock.create(createSessionBlockData(sessionPlanId, {
      activityType: ActivityType.GAME,
      difficulty: DifficultyLevel.HARD,
      estimatedMinutes: 15,
      order: 3,
    }));
    expect(block.sessionPlanId).toBe(sessionPlanId);
    expect(block.activityType).toBe(ActivityType.GAME);
    expect(block.difficulty).toBe(DifficultyLevel.HARD);
    expect(block.estimatedMinutes).toBe(15);
    expect(block.order).toBe(3);

    const started = block.start();
    expect(started.activityType).toBe(ActivityType.GAME);
  });
});

describe('SessionPlanRepository', () => {
  let childId: string;
  let planRepo: SessionPlanRepository;

  beforeAll(async () => {
    planRepo = new SessionPlanRepository();
  });

  beforeEach(async () => {
    const user = await createTestUser();
    childId = (await createTestChild(user.id)).id;
  });

  it('creates a session plan with GENERATED status', async () => {
    const plan = SessionPlan.create({ childId, durationMinutes: 30 });
    const saved = await planRepo.create(plan);
    expect(saved.childId).toBe(childId);
    expect(saved.durationMinutes).toBe(30);
    expect(saved.status).toBe(SessionStatus.GENERATED);

    const found = await planRepo.findById(saved.id);
    expect(found).not.toBeNull();
    expect(found!.childId).toBe(childId);
  });

  it('finds by childId returns child plans', async () => {
    const child2 = (await createTestChild((await createTestUser()).id));
    const plan1 = SessionPlan.create({ childId, durationMinutes: 20 });
    const plan2 = SessionPlan.create({ childId: child2.id, durationMinutes: 25 });
    await planRepo.create(plan1);
    await planRepo.create(plan2);

    const child1Plans = await planRepo.findByChildId(childId);
    expect(child1Plans.length).toBeGreaterThanOrEqual(1);
  });

  it('updates session plan status', async () => {
    const plan = SessionPlan.create({ childId, durationMinutes: 30 });
    const saved = await planRepo.create(plan);

    const updated = await planRepo.updateStatus(saved.id, SessionStatus.STARTED);
    expect(updated.status).toBe(SessionStatus.STARTED);
    expect(updated.startedAt).toBeDefined();
  });

  it('returns null for non-existent plan', async () => {
    const found = await planRepo.findById(crypto.randomUUID());
    expect(found).toBeNull();
  });

  it('finds active plan by childId', async () => {
    const plan = SessionPlan.create({ childId, durationMinutes: 30 });
    const saved = await planRepo.create(plan);
    await planRepo.updateStatus(saved.id, SessionStatus.STARTED);

    const active = await planRepo.findActiveByChildId(childId);
    expect(active).not.toBeNull();
    expect(active!.status).toBe(SessionStatus.STARTED);
  });
});

describe('SessionBlockRepository', () => {
  let planId: string;
  let blockRepo: SessionBlockRepository;

  beforeAll(async () => {
    blockRepo = new SessionBlockRepository();
  });

  beforeEach(async () => {
    const user = await createTestUser();
    const childId = (await createTestChild(user.id)).id;
    const plan = SessionPlan.create({ childId, durationMinutes: 30 });
    const savedPlan = await new SessionPlanRepository().create(plan);
    planId = savedPlan.id;
  });

  it('creates blocks with sequential ordering', async () => {
    const block1 = SessionBlock.create(createSessionBlockData(planId, { order: 1 }));
    const block2 = SessionBlock.create(createSessionBlockData(planId, { order: 2, activityType: ActivityType.GAME }));

    const saved1 = await blockRepo.create(block1);
    const saved2 = await blockRepo.create(block2);

    expect(saved1.order).toBe(1);
    expect(saved2.order).toBe(2);
    expect(saved1.sessionPlanId).toBe(planId);
  });

  it('finds blocks by session plan id ordered by position', async () => {
    const block1 = SessionBlock.create(createSessionBlockData(planId, { order: 2 }));
    const block2 = SessionBlock.create(createSessionBlockData(planId, { order: 1 }));
    await blockRepo.create(block1);
    await blockRepo.create(block2);

    const blocks = await blockRepo.findBySessionPlanId(planId);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].order).toBeLessThanOrEqual(blocks[1].order);
  });

  it('updates block status', async () => {
    const block = SessionBlock.create(createSessionBlockData(planId));
    const saved = await blockRepo.create(block);

    const updated = await blockRepo.updateStatus(saved.id, SessionBlockStatus.COMPLETED, new Date());
    expect(updated.status).toBe(SessionBlockStatus.COMPLETED);
  });

  it('returns null for non-existent block', async () => {
    const found = await blockRepo.findById(crypto.randomUUID());
    expect(found).toBeNull();
  });
});
