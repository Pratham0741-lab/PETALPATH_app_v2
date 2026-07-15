import { prisma } from '../../config/database.js';
import { cleanDatabase, createTestUser, createTestChild, createTestSubject, createTestSkill, createTestSkillHealth } from '../helpers/factories.js';
import { getAuthToken } from '../helpers/auth.js';
import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';

const request = supertest(app);

function makeEventData(childId: string, overrides: Partial<{
  eventId: string;
  eventType: string;
  sessionId: string;
  idempotencyKey: string;
  timestamp: Date;
  modality: string;
  topicId: string;
  payload: Record<string, unknown>;
}> = {}) {
  const id = overrides.eventId ?? crypto.randomUUID();
  return {
    eventId: id,
    eventType: 'ACTIVITY_COMPLETED' as const,
    eventVersion: 1,
    childId,
    sessionId: crypto.randomUUID(),
    topicId: crypto.randomUUID(),
    idempotencyKey: `ik-${id}`,
    timestamp: new Date(),
    ...overrides,
  };
}

describe('Full Adaptive Pipeline — End-to-End', () => {
  let userId: string;
  let childId: string;
  let authToken: string;
  let subjectId: string;
  let skillId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    const child = await createTestChild(userId);
    childId = child.id;
    authToken = getAuthToken(userId, 'PARENT', childId);
    const subject = await createTestSubject();
    subjectId = subject.id;
    const skill = await createTestSkill(subject.id);
    skillId = skill.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  describe('Stage 1 — Learning Event', () => {
    it('creates a LearningEvent record directly in the database', async () => {
      const eventData = makeEventData(childId);
      const event = await prisma.learningEvent.create({ data: eventData as any });

      expect(event).toBeDefined();
      expect(event.eventId).toBe(eventData.eventId);
      expect(event.childId).toBe(childId);
      expect(event.eventType).toBe('ACTIVITY_COMPLETED');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('enforces unique eventId constraint on LearningEvent', async () => {
      const eventData = makeEventData(childId);
      await prisma.learningEvent.create({ data: eventData as any });

      await expect(
        prisma.learningEvent.create({ data: { ...eventData, idempotencyKey: 'diff-ik' } as any }),
      ).rejects.toThrow();
    });

    it('enforces unique idempotencyKey constraint on LearningEvent', async () => {
      const eventData = makeEventData(childId);
      await prisma.learningEvent.create({ data: eventData as any });

      await expect(
        prisma.learningEvent.create({ data: { ...eventData, eventId: crypto.randomUUID() } as any }),
      ).rejects.toThrow();
    });

    it('rejects event with invalid childId foreign key', async () => {
      const badChildId = crypto.randomUUID();
      const eventData = makeEventData(badChildId);

      await expect(
        prisma.learningEvent.create({ data: eventData as any }),
      ).rejects.toThrow();
    });
  });

  describe('Stage 2 — Learning Evidence', () => {
    it('creates a LearningEvidence record linked to an event', async () => {
      const eventData = makeEventData(childId);
      const event = await prisma.learningEvent.create({ data: eventData as any });

      const evidence = await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: { score: 1, correct: true },
        },
      });

      expect(evidence).toBeDefined();
      expect(evidence.eventId).toBe(event.eventId);
      expect(evidence.childId).toBe(childId);
      expect(evidence.evidenceType).toBe('COMPLETION');
    });

    it('enforces unique eventId on LearningEvidence (one evidence per event)', async () => {
      const eventData = makeEventData(childId);
      const event = await prisma.learningEvent.create({ data: eventData as any });

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: {},
        },
      });

      await expect(
        prisma.learningEvidence.create({
          data: {
            eventId: event.eventId,
            childId,
            sessionId: event.sessionId,
            evidenceType: 'COMPLETION',
            observation: {},
          },
        }),
      ).rejects.toThrow();
    });

    it('cascades delete from LearningEvent to LearningEvidence', async () => {
      const eventData = makeEventData(childId);
      const event = await prisma.learningEvent.create({ data: eventData as any });

      await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'DURATION',
          observation: { durationMs: 5000 },
        },
      });

      await prisma.learningEvent.delete({ where: { eventId: event.eventId } });

      const evidence = await prisma.learningEvidence.findFirst({
        where: { eventId: event.eventId },
      });
      expect(evidence).toBeNull();
    });
  });

  describe('Stage 3 — Learning State (KnowledgeState + TopicState)', () => {
    it('creates a KnowledgeState for a child and topic', async () => {
      const topicId = crypto.randomUUID();

      const ks = await prisma.knowledgeState.create({
        data: {
          childId,
          topicId,
          state: 'NEW',
          confidence: 0,
          mastery: 0,
          stability: 0.5,
          forgettingRate: 0.1,
          reviewIntervalDays: 0,
          correctAttempts: 0,
          incorrectAttempts: 0,
          streak: 0,
          totalAttempts: 0,
          averageResponseTimeMs: 0,
          hintUsage: 0,
          retryCount: 0,
          currentDifficulty: 'MEDIUM',
          enteredAt: new Date(),
          lastTransitionAt: new Date(),
        },
      });

      expect(ks).toBeDefined();
      expect(ks.childId).toBe(childId);
      expect(ks.topicId).toBe(topicId);
      expect(ks.state).toBe('NEW');
      expect(ks.createdAt).toBeInstanceOf(Date);
      expect(ks.updatedAt).toBeInstanceOf(Date);
    });

    it('creates a TopicState for a child and topic', async () => {
      const topicId = crypto.randomUUID();

      const ts = await prisma.topicState.create({
        data: {
          childId,
          topicId,
          state: 'NEW',
          modalityStates: {},
          enteredAt: new Date(),
          lastTransitionAt: new Date(),
        },
      });

      expect(ts).toBeDefined();
      expect(ts.childId).toBe(childId);
      expect(ts.topicId).toBe(topicId);
      expect(ts.state).toBe('NEW');
    });

    it('upserts KnowledgeState correctly (unique childId + topicId)', async () => {
      const topicId = crypto.randomUUID();

      const created = await prisma.knowledgeState.create({
        data: {
          childId,
          topicId,
          state: 'NEW',
          confidence: 0,
          mastery: 10,
          stability: 0.5,
          forgettingRate: 0.1,
          reviewIntervalDays: 0,
          correctAttempts: 1,
          incorrectAttempts: 0,
          streak: 1,
          totalAttempts: 1,
          averageResponseTimeMs: 3000,
          hintUsage: 0,
          retryCount: 0,
          currentDifficulty: 'EASY',
          enteredAt: new Date(),
          lastTransitionAt: new Date(),
        },
      });
      expect(created.mastery).toBe(10);

      const updated = await prisma.knowledgeState.update({
        where: { childId_topicId: { childId, topicId } },
        data: {
          mastery: 50,
          state: 'LEARNING',
          correctAttempts: 3,
          totalAttempts: 3,
          streak: 2,
          currentDifficulty: 'MEDIUM',
        },
      });
      expect(updated.mastery).toBe(50);
      expect(updated.state).toBe('LEARNING');
    });
  });

  describe('Stage 4 — SkillHealth (Adaptive Intelligence Read Model)', () => {
    it('creates a SkillHealth record for a child and skill', async () => {
      const sh = await createTestSkillHealth(childId, skillId, {
        masteryState: 'LEARNING',
        knowledgeScore: 40,
        confidenceScore: 35,
        masteryScore: 42,
      });

      expect(sh).toBeDefined();
      expect(sh.childId).toBe(childId);
      expect(sh.skillId).toBe(skillId);
      expect(sh.masteryState).toBe('LEARNING');
    });

    it('updates SkillHealth scores to reflect learning progress', async () => {
      await createTestSkillHealth(childId, skillId, {
        masteryState: 'LEARNING',
        masteryScore: 30,
      });

      const updated = await prisma.skillHealth.update({
        where: { childId_skillId: { childId, skillId } },
        data: {
          masteryScore: 70,
          masteryState: 'STRONG',
          knowledgeScore: 80,
          confidenceScore: 75,
          reviewCount: 3,
          attemptCount: 10,
        },
      });

      expect(updated.masteryScore).toBe(70);
      expect(updated.masteryState).toBe('STRONG');
      expect(updated.reviewCount).toBe(3);
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Stage 5 — Session Plan (Execution Planner Output)', () => {
    it('creates a SessionPlan record in the database', async () => {
      const plan = await prisma.sessionPlan.create({
        data: {
          childId,
          durationMinutes: 30,
          status: 'GENERATED',
        },
      });

      expect(plan).toBeDefined();
      expect(plan.childId).toBe(childId);
      expect(plan.durationMinutes).toBe(30);
      expect(plan.status).toBe('GENERATED');
      expect(plan.createdAt).toBeInstanceOf(Date);
      expect(plan.updatedAt).toBeInstanceOf(Date);
    });

    it('creates a SessionPlan with SessionBlocks and verifies ordering', async () => {
      const plan = await prisma.sessionPlan.create({
        data: {
          childId,
          durationMinutes: 25,
          status: 'GENERATED',
          sessionBlocks: {
            create: [
              {
                activityType: 'VIDEO',
                difficulty: 'EASY',
                estimatedMinutes: 10,
                position: 0,
                subjectId,
                skillId,
              },
              {
                activityType: 'GAME',
                difficulty: 'MEDIUM',
                estimatedMinutes: 10,
                position: 1,
                subjectId,
                skillId,
              },
              {
                activityType: 'STORY',
                difficulty: 'EASY',
                estimatedMinutes: 5,
                position: 2,
                subjectId,
                skillId,
              },
            ],
          },
        },
        include: { sessionBlocks: { orderBy: { position: 'asc' } } },
      });

      expect(plan.sessionBlocks).toHaveLength(3);
      expect(plan.sessionBlocks[0].position).toBe(0);
      expect(plan.sessionBlocks[0].activityType).toBe('VIDEO');
      expect(plan.sessionBlocks[1].position).toBe(1);
      expect(plan.sessionBlocks[1].activityType).toBe('GAME');
      expect(plan.sessionBlocks[2].position).toBe(2);
      expect(plan.sessionBlocks[2].activityType).toBe('STORY');
      expect(plan.sessionBlocks[0].status).toBe('PENDING');

      const totalEstimated = plan.sessionBlocks.reduce((sum, b) => sum + b.estimatedMinutes, 0);
      expect(totalEstimated).toBe(25);
    });

    it('updates SessionPlan status lifecycle through states', async () => {
      const plan = await prisma.sessionPlan.create({
        data: { childId, durationMinutes: 15, status: 'GENERATED' },
      });
      expect(plan.status).toBe('GENERATED');

      const started = await prisma.sessionPlan.update({
        where: { id: plan.id },
        data: { status: 'STARTED', startedAt: new Date() },
      });
      expect(started.status).toBe('STARTED');
      expect(started.startedAt).toBeInstanceOf(Date);

      const completed = await prisma.sessionPlan.update({
        where: { id: plan.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Stage 6 — Data Integrity Across the Full Chain', () => {
    it('maintains valid foreign keys from event → evidence → child', async () => {
      const eventData = makeEventData(childId);
      const event = await prisma.learningEvent.create({ data: eventData as any });

      const evidence = await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: {},
        },
      });

      const child = await prisma.child.findUnique({ where: { id: childId } });
      expect(child).not.toBeNull();

      const evidenceWithChild = await prisma.learningEvidence.findUnique({
        where: { id: evidence.id },
        include: { child: true },
      });
      expect(evidenceWithChild!.child.id).toBe(childId);

      const eventWithChild = await prisma.learningEvent.findUnique({
        where: { eventId: event.eventId },
        include: { child: true },
      });
      expect(eventWithChild!.child.id).toBe(childId);
    });

    it('maintains valid foreign keys from SessionPlan → Child and SessionBlock → SessionPlan', async () => {
      const plan = await prisma.sessionPlan.create({
        data: {
          childId,
          durationMinutes: 20,
          status: 'GENERATED',
          sessionBlocks: {
            create: [
              { activityType: 'VIDEO', difficulty: 'EASY', estimatedMinutes: 10, position: 0, subjectId, skillId },
              { activityType: 'GAME', difficulty: 'MEDIUM', estimatedMinutes: 10, position: 1, subjectId, skillId },
            ],
          },
        },
        include: { sessionBlocks: true, child: true },
      });

      expect(plan.child.id).toBe(childId);
      expect(plan.sessionBlocks).toHaveLength(2);
      for (const block of plan.sessionBlocks) {
        expect(block.sessionPlanId).toBe(plan.id);
      }
    });

    it('rejects orphaned evidence (no matching child)', async () => {
      const fakeChildId = crypto.randomUUID();
      const eventData = makeEventData(fakeChildId);
      const event = await prisma.learningEvent.create({ data: eventData as any }).catch(() => null);
      if (event) {
        await expect(
          prisma.learningEvidence.create({
            data: {
              eventId: event.eventId,
              childId: fakeChildId,
              sessionId: event.sessionId,
              evidenceType: 'COMPLETION',
              observation: {},
            },
          }),
        ).rejects.toThrow();
      }
    });
  });

  describe('Stage 7 — API Integration', () => {
    it('GET /api/v1/learner/:childId/state returns learner state for authenticated user', async () => {
      const res = await request
        .get(`/api/v1/learner/${childId}/state`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.childId).toBe(childId);
      expect(res.body.data.version).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.learnerStateVersion).toBe(res.body.data.version);
    });

    it('GET /api/v1/learner/:childId/state returns 401 without auth token', async () => {
      const res = await request.get(`/api/v1/learner/${childId}/state`);
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/learner/:childId/state returns 404 for non-existent child', async () => {
      const fakeChildId = crypto.randomUUID();
      const token = getAuthToken(userId, 'PARENT');
      const res = await request
        .get(`/api/v1/learner/${fakeChildId}/state`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('GET /api/v1/learner/:childId/state returns updated state after SkillHealth changes', async () => {
      await createTestSkillHealth(childId, skillId, {
        masteryState: 'STRONG',
        masteryScore: 85,
        knowledgeScore: 90,
        confidenceScore: 88,
      });

      const res = await request
        .get(`/api/v1/learner/${childId}/state`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.overallMasteryScore).toBeGreaterThan(0);
      expect(res.body.data.totalSkillCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.strongSkillCount).toBeGreaterThanOrEqual(1);
    });

    it('bumps version number on subsequent state rebuilds', async () => {
      const res1 = await request
        .get(`/api/v1/learner/${childId}/state`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res1.status).toBe(200);
      const v1 = res1.body.data.version;

      await createTestSkillHealth(childId, skillId, {
        masteryState: 'WEAK',
        masteryScore: 25,
      });

      const res2 = await request
        .get(`/api/v1/learner/${childId}/state`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res2.status).toBe(200);
      const v2 = res2.body.data.version;

      expect(v2).toBeGreaterThanOrEqual(v1 + 1);
    });
  });

  describe('Full Round-Trip Pipeline', () => {
    it('completes the full pipeline: event → evidence → state → plan → API', async () => {
      // Stage 1: Create a learning event
      const eventData = makeEventData(childId, { modality: 'VIDEO' });
      const event = await prisma.learningEvent.create({ data: eventData as any });
      expect(event).toBeDefined();

      // Stage 2: Create evidence for the event
      const evidence = await prisma.learningEvidence.create({
        data: {
          eventId: event.eventId,
          childId,
          sessionId: event.sessionId,
          evidenceType: 'COMPLETION',
          observation: { score: 1, correct: true, modality: 'VIDEO' },
        },
      });
      expect(evidence).toBeDefined();

      // Stage 3: Create knowledge state + topic state for the event's topic
      const topicId = eventData.topicId!;
      await prisma.knowledgeState.create({
        data: {
          childId,
          topicId,
          state: 'LEARNING',
          confidence: 60,
          mastery: 45,
          stability: 0.8,
          forgettingRate: 0.08,
          reviewIntervalDays: 1,
          correctAttempts: 3,
          incorrectAttempts: 1,
          streak: 2,
          totalAttempts: 4,
          averageResponseTimeMs: 3500,
          hintUsage: 0,
          retryCount: 0,
          currentDifficulty: 'MEDIUM',
          enteredAt: new Date(),
          lastTransitionAt: new Date(),
        },
      });

      // Stage 4: Create a skill health for the intelligence read model
      await createTestSkillHealth(childId, skillId, {
        masteryState: 'LEARNING',
        masteryScore: 45,
        knowledgeScore: 50,
        confidenceScore: 60,
      });

      // Stage 5: Create a session plan with blocks
      const plan = await prisma.sessionPlan.create({
        data: {
          childId,
          durationMinutes: 30,
          status: 'GENERATED',
          sessionBlocks: {
            create: [
              { activityType: 'VIDEO', difficulty: 'EASY', estimatedMinutes: 10, position: 0, subjectId, skillId },
              { activityType: 'GAME', difficulty: 'MEDIUM', estimatedMinutes: 10, position: 1, subjectId, skillId },
              { activityType: 'STORY', difficulty: 'EASY', estimatedMinutes: 10, position: 2, subjectId, skillId },
            ],
          },
        },
        include: { sessionBlocks: { orderBy: { position: 'asc' } } },
      });
      expect(plan.sessionBlocks).toHaveLength(3);

      // Stage 6: Verify API returns the learner state
      const res = await request
        .get(`/api/v1/learner/${childId}/state`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.childId).toBe(childId);
      expect(res.body.data.totalSkillCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.weakSkillCount).toBeGreaterThanOrEqual(0);

      // Stage 7: Verify plan persists correctly
      const persistedPlan = await prisma.sessionPlan.findUnique({
        where: { id: plan.id },
        include: { sessionBlocks: { orderBy: { position: 'asc' } } },
      });
      expect(persistedPlan).not.toBeNull();
      expect(persistedPlan!.childId).toBe(childId);
      expect(persistedPlan!.sessionBlocks).toHaveLength(3);

      // Stage 8: Verify evidence is queryable by child
      const evidenceRecords = await prisma.learningEvidence.findMany({
        where: { childId },
      });
      expect(evidenceRecords.length).toBeGreaterThanOrEqual(1);

      // Stage 9: Verify knowledge state is queryable by child and topic
      const ks = await prisma.knowledgeState.findUnique({
        where: { childId_topicId: { childId, topicId } },
      });
      expect(ks).not.toBeNull();
      expect(ks!.mastery).toBe(45);
    });
  });
});
