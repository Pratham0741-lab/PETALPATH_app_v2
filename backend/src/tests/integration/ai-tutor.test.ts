import { prisma } from '../../config/database.js';
import { aiTutorService } from '../../modules/ai-tutor/ai-tutor.service.js';
import {
  createTestUser,
  createTestChild,
  createTestSubject,
} from '../helpers/factories.js';

describe('AI Tutor — Learning Session Engine (Phase 5.5.5)', () => {
  let user: any;
  let child: any;
  let subject: any;
  let skillA: any;
  let skillB: any;
  let skillC: any;

  beforeAll(async () => {
    user = await createTestUser();
    child = await createTestChild(user.id, { ageGroup: 'PRE_NURSERY' });
    subject = await createTestSubject();

    skillA = await prisma.skill.create({
      data: {
        subjectId: subject.id,
        name: 'Tutor Skill A',
        skillCode: 'TUTOR_A',
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
        name: 'Tutor Skill B',
        skillCode: 'TUTOR_B',
        isRootSkill: false,
        displayOrder: 2,
        difficulty: 3,
        estimatedDuration: 10,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });
    skillC = await prisma.skill.create({
      data: {
        subjectId: subject.id,
        name: 'Tutor Skill C',
        skillCode: 'TUTOR_C',
        isRootSkill: false,
        displayOrder: 3,
        difficulty: 4,
        estimatedDuration: 10,
        isCoreSkill: false,
        isOptionalSkill: true,
      },
    });
  });

  beforeEach(async () => {
    await prisma.sessionEvent.deleteMany();
    await prisma.sessionBlock.deleteMany();
    await prisma.sessionPlan.deleteMany();
    await prisma.skillHealth.deleteMany();
    await prisma.skillHistory.deleteMany();
    await prisma.childSkillCurriculum.deleteMany();
  });

  afterAll(async () => {
    await prisma.sessionEvent.deleteMany();
    await prisma.sessionBlock.deleteMany();
    await prisma.sessionPlan.deleteMany();
    await prisma.skillHealth.deleteMany();
    await prisma.skillHistory.deleteMany();
    await prisma.childSkillCurriculum.deleteMany();
    await prisma.skill.deleteMany({ where: { id: { in: [skillA.id, skillB.id, skillC.id] } } });
    await prisma.child.deleteMany({ where: { id: child.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.subject.deleteMany({ where: { id: subject.id } });
  });

  function seedCurriculum(skillId: string, overrides: Record<string, any> = {}) {
    return prisma.childSkillCurriculum.create({
      data: {
        childId: child.id,
        skillId,
        state: 'AVAILABLE',
        unlockRatio: 0,
        priority: 0,
        ...overrides,
      },
    });
  }

  describe('startSession', () => {
    it('should create a session plan with blocks from the roadmap', async () => {
      await seedCurriculum(skillA.id);
      await seedCurriculum(skillB.id);

      const result = await aiTutorService.startSession({ childId: child.id, durationMinutes: 30 });

      expect(result.sessionId).toBeDefined();
      expect(result.status).toBe('STARTED');
      expect(result.blocks.length).toBeGreaterThanOrEqual(1);
      expect(result.startedAt).not.toBeNull();
      expect(result.completedAt).toBeNull();

      const blocks = await prisma.sessionBlock.findMany({ where: { sessionPlanId: result.sessionId } });
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      blocks.forEach((b) => {
        expect(b.status).toBe('PENDING');
        expect(b.activityType).toBeDefined();
      });

      const events = await prisma.sessionEvent.findMany({ where: { sessionPlanId: result.sessionId } });
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].eventType).toBe('STARTED');
    });

    it('should throw if an active session already exists', async () => {
      await seedCurriculum(skillA.id);
      await aiTutorService.startSession({ childId: child.id, durationMinutes: 15 });
      await expect(
        aiTutorService.startSession({ childId: child.id, durationMinutes: 15 }),
      ).rejects.toThrow('An active session already exists');
    });
  });

  describe('resumeSession', () => {
    it('should return the session with blocks', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 20 });
      const result = await aiTutorService.resumeSession({ childId: child.id, sessionId: session.sessionId });

      expect(result.sessionId).toBe(session.sessionId);
      expect(result.status).toBe('STARTED');
      expect(result.blocks.length).toBeGreaterThanOrEqual(1);
    });

    it('should transition PAUSED to STARTED and emit RESUMED event', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 20 });
      await prisma.sessionPlan.update({ where: { id: session.sessionId }, data: { status: 'PAUSED' } });
      const result = await aiTutorService.resumeSession({ childId: child.id, sessionId: session.sessionId });

      expect(result.status).toBe('STARTED');
      const events = await prisma.sessionEvent.findMany({ where: { sessionPlanId: session.sessionId, eventType: 'RESUMED' } });
      expect(events.length).toBe(1);
    });

    it('should throw for a completed session', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 15 });
      await aiTutorService.endSession({ childId: child.id, sessionId: session.sessionId });
      await expect(
        aiTutorService.resumeSession({ childId: child.id, sessionId: session.sessionId }),
      ).rejects.toThrow('Session is already ended');
    });

    it('should throw for wrong child', async () => {
      const otherChild = await createTestChild(user.id, { ageGroup: 'PRE_NURSERY' });
      await expect(
        aiTutorService.resumeSession({ childId: otherChild.id, sessionId: '00000000-0000-0000-0000-000000000000' }),
      ).rejects.toThrow('Session not found');
    });
  });

  describe('endSession', () => {
    it('should complete the session and create COMPLETED event', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 15 });
      const result = await aiTutorService.endSession({ childId: child.id, sessionId: session.sessionId });

      expect(result.status).toBe('COMPLETED');
      expect(result.completedAt).not.toBeNull();

      const events = await prisma.sessionEvent.findMany({ where: { sessionPlanId: session.sessionId, eventType: 'COMPLETED' } });
      expect(events.length).toBe(1);
    });

    it('should throw for already ended session', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 15 });
      await aiTutorService.endSession({ childId: child.id, sessionId: session.sessionId });
      await expect(
        aiTutorService.endSession({ childId: child.id, sessionId: session.sessionId }),
      ).rejects.toThrow('Session is already ended');
    });
  });

  describe('getNextActivity', () => {
    it('should return the first pending block', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 20 });
      const next = await aiTutorService.getNextActivity(session.sessionId, child.id);

      expect(next).not.toBeNull();
      expect(next!.sessionId).toBe(session.sessionId);
      expect(next!.blockId).toBeDefined();
      expect(next!.activityType).toBeDefined();
    });

    it('should return null if session not found', async () => {
      const result = await aiTutorService.getNextActivity('00000000-0000-0000-0000-000000000000', child.id);
      expect(result).toBeNull();
    });

    it('should return null if all blocks completed', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 20 });
      const blocks = await prisma.sessionBlock.findMany({ where: { sessionPlanId: session.sessionId } });
      for (const block of blocks) {
        await prisma.sessionBlock.update({ where: { id: block.id }, data: { status: 'COMPLETED' } });
      }
      const next = await aiTutorService.getNextActivity(session.sessionId, child.id);
      expect(next).toBeNull();
    });
  });

  describe('recordProgress', () => {
    it('should mark block completed and evaluate mastery', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 20 });
      const block = (await prisma.sessionBlock.findFirst({ where: { sessionPlanId: session.sessionId } }))!;

      const result = await aiTutorService.recordProgress({
        childId: child.id,
        sessionId: session.sessionId,
        blockId: block.id,
        skillId: skillA.id,
        accuracy: 95,
        responseTime: 30,
        attempts: 1,
        retries: 0,
        engagementScore: 90,
        helpRequests: 0,
        sessionDuration: 300,
      });

      expect(result.blockId).toBe(block.id);
      expect(result.blockStatus).toBe('COMPLETED');
      expect(result.sessionComplete).toBeDefined();
      const updatedBlock = await prisma.sessionBlock.findUnique({ where: { id: block.id } });
      expect(updatedBlock!.status).toBe('COMPLETED');
    });

    it('should throw for inactive session', async () => {
      await seedCurriculum(skillA.id);
      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 20 });
      await aiTutorService.endSession({ childId: child.id, sessionId: session.sessionId });

      await expect(
        aiTutorService.recordProgress({
          childId: child.id,
          sessionId: session.sessionId,
          blockId: '00000000-0000-0000-0000-000000000000',
          skillId: skillA.id,
          accuracy: 80,
          responseTime: 20,
          attempts: 1,
          retries: 0,
          engagementScore: 80,
          helpRequests: 0,
          sessionDuration: 200,
        }),
      ).rejects.toThrow('Session is not active');
    });
  });

  describe('full session lifecycle', () => {
    it('should complete a full session and mark session COMPLETED', async () => {
      await seedCurriculum(skillA.id);
      await seedCurriculum(skillB.id);

      const session = await aiTutorService.startSession({ childId: child.id, durationMinutes: 30 });
      expect(session.blocks.length).toBeGreaterThanOrEqual(1);

      const blocks = await prisma.sessionBlock.findMany({
        where: { sessionPlanId: session.sessionId },
        orderBy: { position: 'asc' },
      });

      for (const block of blocks) {
        const result = await aiTutorService.recordProgress({
          childId: child.id,
          sessionId: session.sessionId,
          blockId: block.id,
          skillId: skillA.id,
          accuracy: 85,
          responseTime: 25,
          attempts: 1,
          retries: 0,
          engagementScore: 85,
          helpRequests: 1,
          sessionDuration: 180,
        });
        expect(result.blockStatus).toBe('COMPLETED');
      }

      const completedSession = await prisma.sessionPlan.findUnique({ where: { id: session.sessionId } });
      expect(completedSession!.status).toBe('COMPLETED');
      expect(completedSession!.completedAt).not.toBeNull();
    });
  });
});
