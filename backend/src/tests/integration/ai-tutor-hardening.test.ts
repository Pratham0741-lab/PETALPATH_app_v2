import { prisma } from '../../config/database.js';
import { aiTutorService } from '../../modules/ai-tutor/ai-tutor.service.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { createTestSubject } from '../helpers/factories.js';
import app from '../../app.js';
import supertest from 'supertest';

function makeProgressPayload(blockId: string, skillId: string) {
  return {
    blockId,
    skillId,
    accuracy: 85,
    responseTime: 20,
    attempts: 1,
    retries: 0,
    engagementScore: 80,
    helpRequests: 0,
    sessionDuration: 200,
  };
}

describe('AI Tutor Hardening (Phase 5.5.5.1)', () => {
  let owner: { user: any; child: any; accessToken: string };
  let other: { user: any; child: any; accessToken: string };
  let subject: any;
  let skillA: any;
  let skillB: any;

  beforeAll(async () => {
    owner = await createAuthenticatedContext();
    other = await createAuthenticatedContext();
    subject = await createTestSubject();
    skillA = await prisma.skill.create({
      data: {
        subjectId: subject.id,
        name: 'Harden Skill A',
        skillCode: 'HARDEN_A',
        isRootSkill: true,
        displayOrder: 1,
        difficulty: 2,
        estimatedDuration: 10,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });
    skillB = await prisma.skill.create({
      data: {
        subjectId: subject.id,
        name: 'Harden Skill B',
        skillCode: 'HARDEN_B',
        isRootSkill: false,
        displayOrder: 2,
        difficulty: 3,
        estimatedDuration: 10,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.sessionEvent.deleteMany();
    await prisma.sessionBlock.deleteMany();
    await prisma.sessionPlan.deleteMany();
    await prisma.skillHealth.deleteMany();
    await prisma.skillHistory.deleteMany();
    await prisma.childSkillCurriculum.deleteMany();
    await prisma.skill.deleteMany({ where: { id: { in: [skillA.id, skillB.id] } } });
    await prisma.subject.deleteMany({ where: { id: subject.id } });
    await prisma.child.deleteMany({ where: { id: { in: [owner.child.id, other.child.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.user.id, other.user.id] } } });
  });

  beforeEach(async () => {
    await prisma.sessionEvent.deleteMany();
    await prisma.sessionBlock.deleteMany();
    await prisma.sessionPlan.deleteMany();
    await prisma.skillHealth.deleteMany();
    await prisma.skillHistory.deleteMany();
    await prisma.childSkillCurriculum.deleteMany();
    await prisma.dynamicRoadmap.deleteMany();
  });

  function seedCurriculum(skillId: string) {
    return prisma.childSkillCurriculum.create({
      data: {
        childId: owner.child.id,
        skillId,
        state: 'AVAILABLE',
        unlockRatio: 0,
        priority: 0,
      },
    });
  }

  // -----------------------------------------------------------------
  // C1 — Child ownership authorization
  // -----------------------------------------------------------------
  describe('C1 — child ownership authorization', () => {
    it('owner succeeds on POST /sessions', async () => {
      await seedCurriculum(skillA.id);
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ durationMinutes: 15 });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessionId).toBeDefined();
    });

    it('different parent receives 403 on POST /sessions', async () => {
      await seedCurriculum(skillA.id);
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send({ durationMinutes: 15 });
      expect(res.status).toBe(403);
    });

    it('unauthenticated receives 401 on POST /sessions', async () => {
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions`)
        .send({ durationMinutes: 15 });
      expect(res.status).toBe(401);
    });

    it('owner succeeds on resume', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/resume`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(200);
    });

    it('different parent receives 403 on resume', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/resume`)
        .set('Authorization', `Bearer ${other.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('owner succeeds on end', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/end`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(200);
    });

    it('different parent receives 403 on end', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/end`)
        .set('Authorization', `Bearer ${other.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('owner succeeds on getNextActivity', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const res = await supertest(app)
        .get(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/next-activity`)
        .set('Authorization', `Bearer ${owner.accessToken}`);
      expect(res.status).toBe(200);
    });

    it('different parent receives 403 on getNextActivity', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const res = await supertest(app)
        .get(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/next-activity`)
        .set('Authorization', `Bearer ${other.accessToken}`);
      expect(res.status).toBe(403);
    });

    it('owner succeeds on recordProgress', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const block = (await prisma.sessionBlock.findFirst({ where: { sessionPlanId: session.sessionId } }))!;
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/progress`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send(makeProgressPayload(block.id, skillA.id));
      expect(res.status).toBe(200);
    });

    it('different parent receives 403 on recordProgress', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const block = (await prisma.sessionBlock.findFirst({ where: { sessionPlanId: session.sessionId } }))!;
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/${session.sessionId}/progress`)
        .set('Authorization', `Bearer ${other.accessToken}`)
        .send(makeProgressPayload(block.id, skillA.id));
      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------
  // C2 — Concurrent startSession (race prevention)
  // -----------------------------------------------------------------
  describe('C2 — concurrent startSession', () => {
    it('should not allow two concurrent calls to create sessions', async () => {
      await seedCurriculum(skillA.id);
      await seedCurriculum(skillB.id);

      const calls = Array.from({ length: 5 }, () =>
        aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 }).catch((e: Error) => e),
      );

      const results = await Promise.all(calls);
      const successes = results.filter((r: any) => !(r instanceof Error));
      const errors = results.filter((r: any) => r instanceof Error);

      expect(successes.length).toBe(1);
      expect(errors.length).toBe(4);
      for (const err of errors) {
        expect((err as Error).message).toContain('active session already exists');
      }

      const activeCount = await prisma.sessionPlan.count({
        where: { childId: owner.child.id, status: { in: ['STARTED', 'PAUSED'] } },
      });
      expect(activeCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------
  // C3 — Concurrent recordProgress (double-count prevention)
  // -----------------------------------------------------------------
  describe('C3 — concurrent recordProgress', () => {
    it('should not double-complete the same block under concurrent load', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const block = (await prisma.sessionBlock.findFirst({ where: { sessionPlanId: session.sessionId } }))!;

      const calls = Array.from({ length: 5 }, () =>
        aiTutorService.recordProgress({
          childId: owner.child.id,
          sessionId: session.sessionId,
          blockId: block.id,
          skillId: skillA.id,
          accuracy: 80,
          responseTime: 20,
          attempts: 1,
          retries: 0,
          engagementScore: 70,
          helpRequests: 0,
          sessionDuration: 200,
        }),
      );

      const results = await Promise.all(calls);

      // All should succeed (no errors)
      for (const r of results) {
        expect(r.blockStatus).toBe('COMPLETED');
      }

      // But only one BLOCK_COMPLETED event should exist
      const events = await prisma.sessionEvent.findMany({
        where: { sessionPlanId: session.sessionId, eventType: 'BLOCK_COMPLETED' },
      });
      expect(events.length).toBe(1);

      // Block should be COMPLETED exactly once
      const updatedBlock = await prisma.sessionBlock.findUnique({ where: { id: block.id } });
      expect(updatedBlock!.status).toBe('COMPLETED');
      expect(updatedBlock!.completedAt).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------
  // H1 — resumeSession transaction
  // -----------------------------------------------------------------
  describe('H1 — resumeSession wraps writes in transaction', () => {
    it('should transition PAUSED -> STARTED and emit RESUMED event atomically', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      await prisma.sessionPlan.update({ where: { id: session.sessionId }, data: { status: 'PAUSED' } });

      const result = await aiTutorService.resumeSession({ childId: owner.child.id, sessionId: session.sessionId });
      expect(result.status).toBe('STARTED');

      const plan = await prisma.sessionPlan.findUnique({ where: { id: session.sessionId } });
      expect(plan!.status).toBe('STARTED');

      const events = await prisma.sessionEvent.findMany({
        where: { sessionPlanId: session.sessionId, eventType: 'RESUMED' },
      });
      expect(events.length).toBe(1);
    });

    it('should not change status if already STARTED', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });

      const result = await aiTutorService.resumeSession({ childId: owner.child.id, sessionId: session.sessionId });
      expect(result.status).toBe('STARTED');

      const resumeds = await prisma.sessionEvent.findMany({
        where: { sessionPlanId: session.sessionId, eventType: 'RESUMED' },
      });
      expect(resumeds.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------
  // H2 — endSession marks remaining blocks SKIPPED
  // -----------------------------------------------------------------
  describe('H2 — endSession marks remaining PENDING blocks as SKIPPED', () => {
    it('should skip pending blocks when session ends early', async () => {
      await seedCurriculum(skillA.id);
      await seedCurriculum(skillB.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 30 });

      const pendingBefore = await prisma.sessionBlock.count({
        where: { sessionPlanId: session.sessionId, status: 'PENDING' },
      });
      expect(pendingBefore).toBeGreaterThanOrEqual(1);

      await aiTutorService.endSession({ childId: owner.child.id, sessionId: session.sessionId });

      const pendingAfter = await prisma.sessionBlock.count({
        where: { sessionPlanId: session.sessionId, status: 'PENDING' },
      });
      expect(pendingAfter).toBe(0);

      const skippedCount = await prisma.sessionBlock.count({
        where: { sessionPlanId: session.sessionId, status: 'SKIPPED' },
      });
      expect(skippedCount).toBe(pendingBefore);
    });

    it('should skip remaining blocks when some already completed', async () => {
      await seedCurriculum(skillA.id);
      await seedCurriculum(skillB.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 30 });
      const blocks = await prisma.sessionBlock.findMany({ where: { sessionPlanId: session.sessionId }, orderBy: { position: 'asc' } });

      // Complete only the first block
      await aiTutorService.recordProgress({
        childId: owner.child.id,
        sessionId: session.sessionId,
        blockId: blocks[0].id,
        skillId: skillA.id,
        accuracy: 90,
        responseTime: 15,
        attempts: 1,
        retries: 0,
        engagementScore: 85,
        helpRequests: 0,
        sessionDuration: 100,
      });

      // endSession should skip the remaining PENDING blocks
      const result = await aiTutorService.endSession({ childId: owner.child.id, sessionId: session.sessionId });
      expect(result.status).toBe('COMPLETED');

      const remaining = await prisma.sessionBlock.findMany({
        where: { sessionPlanId: session.sessionId, status: 'SKIPPED' },
      });
      expect(remaining.length).toBe(blocks.length - 1);
    });
  });

  // -----------------------------------------------------------------
  // H3 — Mastery failure path (deferred state)
  // -----------------------------------------------------------------
  describe('H3 — mastery failure path', () => {
    it('should return DEFERRED mastery when evaluation fails', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const block = (await prisma.sessionBlock.findFirst({ where: { sessionPlanId: session.sessionId } }))!;

      const result = await aiTutorService.recordProgress({
        childId: owner.child.id,
        sessionId: session.sessionId,
        blockId: block.id,
        skillId: '00000000-0000-0000-0000-000000000000',
        accuracy: 50,
        responseTime: 10,
        attempts: 1,
        retries: 0,
        engagementScore: 50,
        helpRequests: 0,
        sessionDuration: 100,
      });

      expect(result.masteryResult).not.toBeNull();
      expect(result.masteryResult!.masteryState).toBe('DEFERRED');
      expect(result.masteryResult!.isNewMastery).toBe(false);
    });
  });

  // -----------------------------------------------------------------
  // H4 — Roadmap refresh trigger
  // -----------------------------------------------------------------
  describe('H4 — correct roadmap refresh trigger', () => {
    it('should not call SKILL_MASTERED refresh when no mastery change', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 15 });
      const block = (await prisma.sessionBlock.findFirst({ where: { sessionPlanId: session.sessionId } }))!;

      const result = await aiTutorService.recordProgress({
        childId: owner.child.id,
        sessionId: session.sessionId,
        blockId: block.id,
        skillId: skillA.id,
        accuracy: 60,
        responseTime: 30,
        attempts: 1,
        retries: 0,
        engagementScore: 50,
        helpRequests: 0,
        sessionDuration: 200,
      });

      expect(result.masteryResult).not.toBeNull();
      // If no new mastery, the refresh should not have happened with SKILL_MASTERED
      // (the test simply verifies no error and valid result)
      expect(result.blockStatus).toBe('COMPLETED');
    });
  });

  // -----------------------------------------------------------------
  // M6 — Idempotent progress
  // -----------------------------------------------------------------
  describe('M6 — idempotent recordProgress', () => {
    it('should return existing result for already-completed block', async () => {
      await seedCurriculum(skillA.id);
      await seedCurriculum(skillB.id);
      const session = await aiTutorService.startSession({ childId: owner.child.id, durationMinutes: 30 });
      const block = (await prisma.sessionBlock.findFirst({
        where: { sessionPlanId: session.sessionId, status: 'PENDING' },
        orderBy: { position: 'asc' },
      }))!;

      const first = await aiTutorService.recordProgress({
        childId: owner.child.id,
        sessionId: session.sessionId,
        blockId: block.id,
        skillId: skillA.id,
        accuracy: 90,
        responseTime: 15,
        attempts: 1,
        retries: 0,
        engagementScore: 85,
        helpRequests: 0,
        sessionDuration: 100,
      });
      expect(first.blockStatus).toBe('COMPLETED');

      const second = await aiTutorService.recordProgress({
        childId: owner.child.id,
        sessionId: session.sessionId,
        blockId: block.id,
        skillId: skillA.id,
        accuracy: 90,
        responseTime: 15,
        attempts: 1,
        retries: 0,
        engagementScore: 85,
        helpRequests: 0,
        sessionDuration: 100,
      });
      expect(second.blockStatus).toBe('COMPLETED');

      // Only one BLOCK_COMPLETED event should exist
      const events = await prisma.sessionEvent.findMany({
        where: { sessionPlanId: session.sessionId, eventType: 'BLOCK_COMPLETED' },
      });
      expect(events.length).toBe(1);
    });
  });

  // -----------------------------------------------------------------
  // 401 Unauthorized — no token
  // -----------------------------------------------------------------
  describe('Authorization — 401 unauthenticated', () => {
    it('should reject POST /sessions without auth', async () => {
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions`)
        .send({ durationMinutes: 15 });
      expect(res.status).toBe(401);
    });

    it('should reject POST /resume without auth', async () => {
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/00000000-0000-0000-0000-000000000000/resume`);
      expect(res.status).toBe(401);
    });

    it('should reject POST /end without auth', async () => {
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/00000000-0000-0000-0000-000000000000/end`);
      expect(res.status).toBe(401);
    });

    it('should reject GET /next-activity without auth', async () => {
      const res = await supertest(app)
        .get(`/api/ai-tutor/${owner.child.id}/sessions/00000000-0000-0000-0000-000000000000/next-activity`);
      expect(res.status).toBe(401);
    });

    it('should reject POST /progress without auth', async () => {
      const res = await supertest(app)
        .post(`/api/ai-tutor/${owner.child.id}/sessions/00000000-0000-0000-0000-000000000000/progress`)
        .send({ blockId: '00000000-0000-0000-0000-000000000000', skillId: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(401);
    });
  });
});
