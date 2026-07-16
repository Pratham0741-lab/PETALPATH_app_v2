import { prisma } from '../../config/database.js';
import { masteryEngineService } from '../../modules/mastery-engine/mastery-engine.service.js';
import { masteryEngineRepository } from '../../modules/mastery-engine/mastery-engine.repository.js';
import { placementService } from '../../modules/placement/placement.service.js';
import {
  createTestUser,
  createTestChild,
  createTestSubject,
} from '../helpers/factories.js';

async function createPlacementAssessment(ageGroup: string, subjectId: string, skillId: string) {
  const assessment = await prisma.assessment.create({
    data: {
      title: `${ageGroup} Placement Test`,
      description: `Placement assessment for ${ageGroup}`,
      ageGroup,
      estimatedMinutes: 15,
      isActive: true,
      questions: {
        create: [
          {
            prompt: 'What is 1+1?',
            questionType: 'MULTIPLE_CHOICE',
            options: { skillId, choices: [{ label: '1', value: '1' }, { label: '2', value: '2' }] },
            order: 1,
            maxScore: 1,
            correctAnswer: '2',
          },
          {
            prompt: 'What is 2+2?',
            questionType: 'MULTIPLE_CHOICE',
            options: { skillId, choices: [{ label: '3', value: '3' }, { label: '4', value: '4' }] },
            order: 2,
            maxScore: 1,
            correctAnswer: '4',
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  return assessment;
}

describe('Mastery Engine (Phase 5.5.4)', () => {
  let user: any;
  let child: any;
  let subject: any;
  let rootSkill: any;
  let dependentSkill: any;
  let independentSkill: any;
  let assessment: any;

  beforeAll(async () => {
    user = await createTestUser();
    child = await createTestChild(user.id, { ageGroup: 'PRE_NURSERY' });
    subject = await createTestSubject();

    rootSkill = await prisma.skill.create({
      data: {
        subjectId: subject.id,
        name: 'Mastery Engine Root Skill',
        skillCode: 'ME_ROOT',
        isRootSkill: true,
        displayOrder: 1,
        difficulty: 2,
        estimatedDuration: 15,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });

    dependentSkill = await prisma.skill.create({
      data: {
        subjectId: subject.id,
        name: 'Mastery Engine Dependent Skill',
        skillCode: 'ME_DEPENDENT',
        isRootSkill: false,
        displayOrder: 2,
        difficulty: 3,
        estimatedDuration: 20,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });

    independentSkill = await prisma.skill.create({
      data: {
        subjectId: subject.id,
        name: 'Mastery Engine Independent Skill',
        skillCode: 'ME_INDEPENDENT',
        isRootSkill: false,
        displayOrder: 3,
        difficulty: 1,
        estimatedDuration: 10,
        isCoreSkill: false,
        isOptionalSkill: false,
      },
    });

    await prisma.skillDependency.create({
      data: { parentSkillId: rootSkill.id, childSkillId: dependentSkill.id, weight: 1 },
    });

    assessment = await createPlacementAssessment('PRE_NURSERY', subject.id, rootSkill.id);
  });

  afterAll(async () => {
    await prisma.reinforcementQueue.deleteMany({ where: { childId: child.id } });
    await prisma.skillHealth.deleteMany({ where: { childId: child.id } });
    await prisma.skillHistory.deleteMany({ where: { childId: child.id } });
    await prisma.regressionLog.deleteMany({ where: { childId: child.id } });
    await prisma.childSkillCurriculum.deleteMany({ where: { childId: child.id } });
    await prisma.dynamicRoadmap.deleteMany({ where: { childId: child.id } });
    await prisma.skillDependency.deleteMany({
      where: { OR: [{ childSkillId: dependentSkill.id }, { parentSkillId: rootSkill.id }] },
    });
    await prisma.assessmentAttempt.deleteMany({ where: { childId: child.id } });
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });
    await prisma.assessment.delete({ where: { id: assessment.id } });
    await prisma.skill.delete({ where: { id: independentSkill.id } });
    await prisma.skill.delete({ where: { id: dependentSkill.id } });
    await prisma.skill.delete({ where: { id: rootSkill.id } });
    await prisma.subject.delete({ where: { id: subject.id } });
    await prisma.child.delete({ where: { id: child.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  async function cleanupEvaluationData() {
    await prisma.skillHealth.deleteMany({ where: { childId: child.id } });
    await prisma.skillHistory.deleteMany({ where: { childId: child.id } });
    await prisma.regressionLog.deleteMany({ where: { childId: child.id } });
    await prisma.reinforcementQueue.deleteMany({ where: { childId: child.id } });
  }

  async function runPlacement() {
    await placementService.restartPlacement(child.id);
    const progress = await placementService.startPlacement(child.id, assessment.id);
    await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
    await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');
    await placementService.completePlacement(child.id, progress.attemptId);
  }

  function makeEvaluateInput(skillId: string, overrides: Record<string, any> = {}) {
    return {
      childId: child.id,
      skillId,
      accuracy: 90,
      responseTime: 5,
      attempts: 1,
      retries: 0,
      engagementScore: 85,
      helpRequests: 0,
      sessionDuration: 30,
      ...overrides,
    };
  }

  describe('evaluateMastery', () => {
    beforeEach(async () => {
      await cleanupEvaluationData();
      await runPlacement();
    });

    it('should evaluate mastery and return all score dimensions', async () => {
      const result = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id),
      );

      expect(result).toBeDefined();
      expect(result.skillId).toBe(rootSkill.id);
      expect(result.masteryScore).toBeGreaterThan(0);
      expect(result.knowledgeScore).toBe(90);
      expect(result.confidenceScore).toBe(100);
      expect(result.consistencyScore).toBeGreaterThan(0);
      expect(result.retentionScore).toBeGreaterThan(0);
      expect(result.currentState).toBeDefined();
      expect(result.nextReviewDate).toBeDefined();
    });

    it('should detect MASTERED state for high scores', async () => {
      const result = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id),
      );

      expect(['MASTERED', 'STRONG']).toContain(result.currentState);
    });

    it('should detect LEARNING state for low scores', async () => {
      const result = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, {
          accuracy: 20,
          retries: 5,
          helpRequests: 5,
          engagementScore: 30,
        }),
      );

      expect(result.currentState).toBe('LEARNING');
      expect(result.masteryScore).toBeLessThan(45);
    });

    it('should upsert SkillHealth record', async () => {
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id),
      );

      const health = await masteryEngineRepository.findSkillHealth(child.id, rootSkill.id);
      expect(health).toBeDefined();
      expect(health!.masteryScore).toBeGreaterThan(0);
    });

    it('should create SkillHistory entry', async () => {
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id),
      );

      const history = await masteryEngineRepository.findSkillHistory(child.id, rootSkill.id);
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect regression on score drop', async () => {
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 95 }),
      );

      const result = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, {
          accuracy: 30,
          retries: 5,
          helpRequests: 4,
          engagementScore: 20,
        }),
      );

      expect(result.isRegression).toBe(true);
    });

    it('should upsert reinforcement queue for WEAK state', async () => {
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, {
          accuracy: 50,
          retries: 3,
          helpRequests: 2,
          engagementScore: 40,
        }),
      );

      const queue = await masteryEngineRepository.findReinforcementQueues(child.id);
      const match = queue.find((q) => q.skillId === rootSkill.id);
      expect(match).toBeDefined();
    });

    it('should persist score delta correctly', async () => {
      const first = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 90 }),
      );

      expect(first.masteryScoreDelta).toBeGreaterThan(0);
      if (first.previousMasteryScore === null) {
        expect(first.masteryScoreDelta).toBeCloseTo(first.masteryScore, 0);
      }
    });

    it('should include all required fields in result', async () => {
      const result = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id),
      );

      const requiredFields = [
        'skillId', 'previousState', 'currentState', 'masteryScore',
        'knowledgeScore', 'confidenceScore', 'retentionScore',
        'consistencyScore', 'previousMasteryScore', 'masteryScoreDelta',
        'isRegression', 'isNewMastery', 'unlockedSkills', 'nextReviewDate',
      ];
      for (const field of requiredFields) {
        expect(result).toHaveProperty(field);
      }
    });
  });

  describe('getSkillMastery', () => {
    beforeEach(async () => {
      await cleanupEvaluationData();
    });

    it('should return null for unevaluated skill', async () => {
      const health = await masteryEngineService.getSkillMastery(child.id, independentSkill.id);
      expect(health).toBeNull();
    });

    it('should return health after evaluation', async () => {
      await cleanupEvaluationData();
      await runPlacement();
      await masteryEngineService.evaluateMastery(makeEvaluateInput(rootSkill.id));

      const health = await masteryEngineService.getSkillMastery(child.id, rootSkill.id);
      expect(health).toBeDefined();
    });
  });

  describe('getSkillHistory', () => {
    beforeEach(async () => {
      await cleanupEvaluationData();
    });

    it('should return empty array for unevaluated skill', async () => {
      const history = await masteryEngineService.getSkillHistory(child.id, independentSkill.id);
      expect(history).toEqual([]);
    });

    it('should return history entries after evaluation', async () => {
      await cleanupEvaluationData();
      await runPlacement();
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 70 }),
      );
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 90 }),
      );

      const history = await masteryEngineService.getSkillHistory(child.id, rootSkill.id);
      expect(history.length).toBeGreaterThanOrEqual(2);

      const timestamps = history.map((h) => new Date(h.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });

    it('should contain all required score fields', async () => {
      await cleanupEvaluationData();
      await runPlacement();
      await masteryEngineService.evaluateMastery(makeEvaluateInput(rootSkill.id));

      const history = await masteryEngineService.getSkillHistory(child.id, rootSkill.id);
      expect(history.length).toBeGreaterThanOrEqual(1);

      const entry = history[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('knowledgeScore');
      expect(entry).toHaveProperty('confidenceScore');
      expect(entry).toHaveProperty('retentionScore');
      expect(entry).toHaveProperty('engagementScore');
      expect(entry).toHaveProperty('consistencyScore');
      expect(entry).toHaveProperty('masteryScore');
      expect(entry).toHaveProperty('masteryState');
      expect(entry).toHaveProperty('timestamp');
    });
  });

  describe('getRevisionQueue', () => {
    it('should return empty queue initially', async () => {
      const queue = await masteryEngineService.getRevisionQueue(child.id);
      expect(queue).toEqual([]);
    });

    it('should include WEAK skills in queue', async () => {
      await cleanupEvaluationData();
      await runPlacement();
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, {
          accuracy: 50,
          retries: 3,
          helpRequests: 2,
          engagementScore: 40,
        }),
      );

      const queue = await masteryEngineService.getRevisionQueue(child.id);
      const match = queue.find((q) => q.skillId === rootSkill.id);
      expect(match).toBeDefined();
      expect(match!.priority).toBeGreaterThan(0);
      expect(match!.reason).toBeDefined();
    });
  });

  describe('recalculateMastery', () => {
    it('should throw for skill with no history', async () => {
      await expect(
        masteryEngineService.recalculateMastery(child.id, independentSkill.id),
      ).rejects.toThrow('No history available');
    });

    it('should recalculate mastery from history', async () => {
      await cleanupEvaluationData();
      await runPlacement();
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 60 }),
      );
      await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 80 }),
      );

      const result = await masteryEngineService.recalculateMastery(child.id, rootSkill.id);
      expect(result).toBeDefined();
      expect(result.skillId).toBe(rootSkill.id);
      expect(result.masteryScore).toBeGreaterThan(0);
    });

    it('should return all score dimensions after recalc', async () => {
      await cleanupEvaluationData();
      await runPlacement();
      await masteryEngineService.evaluateMastery(makeEvaluateInput(rootSkill.id));

      const result = await masteryEngineService.recalculateMastery(child.id, rootSkill.id);
      expect(result.knowledgeScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.retentionScore).toBeGreaterThan(0);
      expect(result.consistencyScore).toBeGreaterThan(0);
    });
  });

  describe('processRevision', () => {
    it('should evaluate revision like a normal evaluation', async () => {
      await cleanupEvaluationData();
      await runPlacement();
      const result = await masteryEngineService.processRevision(
        makeEvaluateInput(rootSkill.id),
      );

      expect(result).toBeDefined();
      expect(result.masteryScore).toBeGreaterThan(0);
    });
  });

  describe('consistency score', () => {
    it('should calculate moving average across evaluations', async () => {
      await cleanupEvaluationData();
      await runPlacement();

      const first = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 80 }),
      );

      const second = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id, { accuracy: 100 }),
      );

      const expected = (80 + 100) / 2;
      expect(second.consistencyScore).toBeCloseTo(expected, 0);
      expect(first.consistencyScore).toBeCloseTo(80, 0);
    });
  });

  describe('unlock downstream', () => {
    it('should unlock downstream skills when root is mastered', async () => {
      await cleanupEvaluationData();
      await prisma.childSkillCurriculum.deleteMany({ where: { childId: child.id } });

      await prisma.childSkillCurriculum.createMany({
        data: [
          { childId: child.id, skillId: rootSkill.id, state: 'ACTIVE', unlockRatio: 0, priority: 5 },
          { childId: child.id, skillId: dependentSkill.id, state: 'LOCKED', unlockRatio: 0, priority: 5 },
          { childId: child.id, skillId: independentSkill.id, state: 'AVAILABLE', unlockRatio: 1, priority: 1 },
        ],
      });

      const result = await masteryEngineService.evaluateMastery(
        makeEvaluateInput(rootSkill.id),
      );

      expect(result.unlockedSkills).toContain(dependentSkill.id);
    });
  });

  describe('evaluate on non-existent skill', () => {
    it('should fail with foreign key error for nonexistent skill', async () => {
      const fakeSkillId = '00000000-0000-0000-0000-000000000000';
      await cleanupEvaluationData();
      await runPlacement();

      await expect(
        masteryEngineService.evaluateMastery(makeEvaluateInput(fakeSkillId)),
      ).rejects.toThrow();
    });
  });
});
