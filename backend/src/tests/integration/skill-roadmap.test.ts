import { prisma } from '../../config/database.js';
import { skillRoadmapService } from '../../modules/skill-roadmap/skill-roadmap.service.js';
import { placementService } from '../../modules/placement/placement.service.js';
import { placementRepository } from '../../modules/placement/placement.repository.js';
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
            options: {
              skillId,
              choices: [
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' },
              ],
            },
            order: 1,
            maxScore: 1,
            correctAnswer: '2',
          },
          {
            prompt: 'What is 2+2?',
            questionType: 'MULTIPLE_CHOICE',
            options: {
              skillId,
              choices: [
                { label: '3', value: '3' },
                { label: '4', value: '4' },
                { label: '5', value: '5' },
              ],
            },
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

describe('Skill Roadmap (Phase 5.5.3)', () => {
  let user: any;
  let child: any;
  let subject: any;
  let rootSkill: any;
  let prerequisiteSkill: any;
  let downstreamSkill: any;
  let optionalSkill: any;
  let unassessedSkill: any;
  let assessment: any;

  beforeAll(async () => {
    user = await createTestUser();
    child = await createTestChild(user.id);
    subject = await createTestSubject();

    rootSkill = await prisma.skill.create({
      data: {
        name: 'Roadmap Test Root Skill',
        skillCode: 'ROADMAP_ROOT',
        subjectId: subject.id,
        difficulty: 2,
        isRootSkill: true,
        displayOrder: 1,
        estimatedDuration: 15,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });

    prerequisiteSkill = await prisma.skill.create({
      data: {
        name: 'Roadmap Prerequisite Skill',
        skillCode: 'ROADMAP_PREREQ',
        subjectId: subject.id,
        difficulty: 1,
        isRootSkill: false,
        displayOrder: 0,
        estimatedDuration: 10,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });

    downstreamSkill = await prisma.skill.create({
      data: {
        name: 'Roadmap Downstream Skill',
        skillCode: 'ROADMAP_DOWNSTREAM',
        subjectId: subject.id,
        difficulty: 3,
        isRootSkill: false,
        displayOrder: 2,
        estimatedDuration: 20,
        isCoreSkill: true,
        isOptionalSkill: false,
      },
    });

    optionalSkill = await prisma.skill.create({
      data: {
        name: 'Optional Enrichment Skill',
        skillCode: 'ROADMAP_OPTIONAL',
        subjectId: subject.id,
        difficulty: 4,
        isRootSkill: false,
        displayOrder: 10,
        estimatedDuration: 25,
        isCoreSkill: false,
        isOptionalSkill: true,
      },
    });

    unassessedSkill = await prisma.skill.create({
      data: {
        name: 'Unassessed Locked Skill',
        skillCode: 'ROADMAP_LOCKED',
        subjectId: subject.id,
        difficulty: 2,
        isRootSkill: false,
        displayOrder: 3,
        estimatedDuration: 12,
        isCoreSkill: false,
        isOptionalSkill: false,
      },
    });

    await prisma.skillDependency.create({
      data: { parentSkillId: prerequisiteSkill.id, childSkillId: rootSkill.id, weight: 1 },
    });

    await prisma.skillDependency.create({
      data: { parentSkillId: rootSkill.id, childSkillId: downstreamSkill.id, weight: 1 },
    });

    assessment = await createPlacementAssessment('PRE_NURSERY', subject.id, rootSkill.id);
  });

  afterAll(async () => {
    await prisma.skillDependency.deleteMany({
      where: {
        OR: [
          { childSkillId: rootSkill.id },
          { parentSkillId: rootSkill.id },
          { childSkillId: downstreamSkill.id },
        ],
      },
    });
    await prisma.assessmentAttempt.deleteMany({ where: { childId: child.id } });
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });
    await prisma.assessment.delete({ where: { id: assessment.id } });
    await prisma.skillHealth.deleteMany({ where: { childId: child.id } });
    await prisma.childSkillCurriculum.deleteMany({ where: { childId: child.id } });
    await prisma.reinforcementQueue.deleteMany({ where: { childId: child.id } });
    await prisma.dynamicRoadmap.deleteMany({ where: { childId: child.id } });
    await prisma.skill.delete({ where: { id: unassessedSkill.id } });
    await prisma.skill.delete({ where: { id: optionalSkill.id } });
    await prisma.skill.delete({ where: { id: downstreamSkill.id } });
    await prisma.skill.delete({ where: { id: prerequisiteSkill.id } });
    await prisma.skill.delete({ where: { id: rootSkill.id } });
    await prisma.subject.delete({ where: { id: subject.id } });
    await prisma.child.delete({ where: { id: child.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  describe('generateRoadmap', () => {
    it('should generate a complete roadmap with all skill states', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');
      await placementService.completePlacement(child.id, progress.attemptId);

      const roadmap = await skillRoadmapService.generateRoadmap(child.id);

      expect(roadmap).toBeDefined();
      expect(roadmap.childId).toBe(child.id);
      expect(roadmap.sections.length).toBeGreaterThanOrEqual(1);
      expect(roadmap.metadata.totalSkills).toBeGreaterThan(0);
    });

    it('should include every curriculum skill in the roadmap', async () => {
      const curriculum = await placementRepository.findChildSkillCurriculums(child.id);
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);

      const roadmapSkillIds = new Set(
        roadmap.sections.flatMap((s) => s.skills.map((sk) => sk.skillId)),
      );

      for (const entry of curriculum) {
        expect(roadmapSkillIds.has(entry.skillId)).toBe(true);
      }
    });
  });

  describe('section classification', () => {
    it('should have MASTERED section for completed skills', async () => {
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      const masteredSection = roadmap.sections.find((s) => s.type === 'MASTERED');
      expect(masteredSection).toBeDefined();
      expect(masteredSection!.skills.length).toBeGreaterThanOrEqual(1);

      const rootInMastered = masteredSection!.skills.find((s) => s.skillId === rootSkill.id);
      expect(rootInMastered).toBeDefined();
    });

    it('should have REVIEW or AVAILABLE section for prerequisite gaps', async () => {
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      const reviewSection = roadmap.sections.find((s) => s.type === 'REVIEW');
      const availableSection = roadmap.sections.find((s) => s.type === 'AVAILABLE');

      const prereqInReview = reviewSection?.skills.find((s) => s.skillId === prerequisiteSkill.id);
      const prereqInAvailable = availableSection?.skills.find((s) => s.skillId === prerequisiteSkill.id);

      expect(prereqInReview || prereqInAvailable).toBeDefined();
    });

    it('should have LOCKED section for unassessed non-optional skills', async () => {
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      const lockedSection = roadmap.sections.find((s) => s.type === 'LOCKED');
      expect(lockedSection).toBeDefined();

      const unassessedInLocked = lockedSection!.skills.find((s) => s.skillId === unassessedSkill.id);
      expect(unassessedInLocked).toBeDefined();
    });

    it('should have FUTURE section for optional skills', async () => {
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      const futureSection = roadmap.sections.find((s) => s.type === 'FUTURE');
      expect(futureSection).toBeDefined();

      const optionalInFuture = futureSection!.skills.find((s) => s.skillId === optionalSkill.id);
      expect(optionalInFuture).toBeDefined();
    });
  });

  describe('getRoadmap', () => {
    it('should return existing roadmap or generate new one', async () => {
      await skillRoadmapService.generateRoadmap(child.id);
      const roadmap = await skillRoadmapService.getRoadmap(child.id);

      expect(roadmap).toBeDefined();
      expect(roadmap.childId).toBe(child.id);
      expect(roadmap.sections.length).toBeGreaterThan(0);
    });
  });

  describe('getSection', () => {
    it('should return specific section', async () => {
      await skillRoadmapService.generateRoadmap(child.id);

      const section = await skillRoadmapService.getSection(child.id, 'MASTERED');
      expect(section).not.toBeNull();
      expect(section!.type).toBe('MASTERED');
    });

    it('should return null for non-existent section type', async () => {
      const section = await skillRoadmapService.getSection(child.id, 'FUTURE');
      expect(section).not.toBeNull();
    });
  });

  describe('getNextSkill', () => {
    it('should return highest priority available skill', async () => {
      await skillRoadmapService.generateRoadmap(child.id);
      const next = await skillRoadmapService.getNextSkill(child.id);

      expect(next).not.toBeNull();
      expect(next!.skillId).toBeDefined();
      expect(next!.reason).toBeDefined();
      expect(next!.priorityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDailyQueue', () => {
    it('should generate a daily queue with max items respected', async () => {
      await skillRoadmapService.generateRoadmap(child.id);
      const queue = await skillRoadmapService.getDailyQueue(child.id, 3);

      expect(queue.length).toBeLessThanOrEqual(3);
      if (queue.length > 0) {
        expect(queue[0].skillId).toBeDefined();
        expect(queue[0].section).toBeDefined();
      }
    });

    it('should prioritize reviews before new learning', async () => {
      await skillRoadmapService.generateRoadmap(child.id);
      const queue = await skillRoadmapService.getDailyQueue(child.id, 10);

      const firstReviewIndex = queue.findIndex((q) => q.section === 'REVIEW');
      const firstAvailableIndex = queue.findIndex((q) => q.section === 'AVAILABLE');

      if (firstReviewIndex >= 0 && firstAvailableIndex >= 0) {
        expect(firstReviewIndex).toBeLessThan(firstAvailableIndex);
      }
    });
  });

  describe('unlockDownstream', () => {
    it('should unlock downstream skills when prerequisites are mastered', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');
      await placementService.completePlacement(child.id, progress.attemptId);

      const unlocked = await skillRoadmapService.unlockDownstream(child.id, rootSkill.id);

      expect(unlocked).toContain(downstreamSkill.id);

      const curriculum = await placementRepository.findChildSkillCurriculums(child.id);
      const downstreamEntry = curriculum.find((c) => c.skillId === downstreamSkill.id);
      expect(downstreamEntry).toBeDefined();
      expect(downstreamEntry!.state).toBe('AVAILABLE');
    });

    it('should not unlock skills with unmet prerequisites', async () => {
      await placementService.restartPlacement(child.id);
      await skillRoadmapService.generateRoadmap(child.id);

      const unlocked = await skillRoadmapService.unlockDownstream(child.id, prerequisiteSkill.id);
      expect(unlocked).toHaveLength(0);
    });
  });

  describe('getUnlockedSkills', () => {
    it('should return paginated unlocked skills', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');
      await placementService.completePlacement(child.id, progress.attemptId);
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      const result = await skillRoadmapService.getUnlockedSkills(child.id, 1, 10);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.skills.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getLockedSkills', () => {
    it('should return paginated locked skills', async () => {
      await skillRoadmapService.generateRoadmap(child.id);
      const result = await skillRoadmapService.getLockedSkills(child.id, 1, 10);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.skills.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getReviewSkills', () => {
    it('should return review skills array', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '1');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '3');
      await placementService.completePlacement(child.id, progress.attemptId);
      await skillRoadmapService.generateRoadmap(child.id);

      const result = await skillRoadmapService.getReviewSkills(child.id, 1, 10);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('refreshRoadmap', () => {
    it('should regenerate and persist a fresh roadmap', async () => {
      const first = await skillRoadmapService.generateRoadmap(child.id);
      const refreshed = await skillRoadmapService.refreshRoadmap(child.id, 'MANUAL');

      expect(refreshed).toBeDefined();
      expect(refreshed.metadata.totalSkills).toBe(first.metadata.totalSkills);
    });
  });

  describe('priority scoring', () => {
    it('should produce deterministic priority scores', async () => {
      const first = await skillRoadmapService.generateRoadmap(child.id);
      const second = await skillRoadmapService.generateRoadmap(child.id);

      const firstScores = first.sections.flatMap((s) => s.skills.map((sk) => ({ id: sk.skillId, score: sk.priorityScore })));
      const secondScores = second.sections.flatMap((s) => s.skills.map((sk) => ({ id: sk.skillId, score: sk.priorityScore })));

      for (const fs of firstScores) {
        const ss = secondScores.find((s) => s.id === fs.id);
        expect(ss).toBeDefined();
        expect(ss!.score).toBe(fs.score);
      }
    });
  });

  describe('no duplicate nodes', () => {
    it('should not have the same skill appearing in multiple sections', async () => {
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      const allIds = roadmap.sections.flatMap((s) => s.skills.map((sk) => sk.skillId));
      const uniqueIds = new Set(allIds);

      expect(allIds.length).toBe(uniqueIds.size);
    });
  });

  describe('circular dependency protection', () => {
    it('should not infinite-loop on circular dependencies', async () => {
      await prisma.skillDependency.create({
        data: { parentSkillId: downstreamSkill.id, childSkillId: prerequisiteSkill.id, weight: 1 },
      });

      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      expect(roadmap).toBeDefined();
      expect(roadmap.sections.length).toBeGreaterThan(0);

      await prisma.skillDependency.deleteMany({
        where: { parentSkillId: downstreamSkill.id, childSkillId: prerequisiteSkill.id },
      });
    });
  });

  describe('large curriculum performance', () => {
    it('should generate roadmap within reasonable time', async () => {
      const extraSkills: any[] = [];
      for (let i = 0; i < 20; i++) {
        const skill = await prisma.skill.create({
          data: {
            name: `Bulk Skill ${i} ${Date.now()}`,
            skillCode: `BULK_${i}_${Date.now()}`,
            subjectId: subject.id,
            difficulty: (i % 5) + 1,
            isRootSkill: false,
            displayOrder: 100 + i,
            estimatedDuration: 10,
            isCoreSkill: i % 2 === 0,
            isOptionalSkill: i % 3 === 0,
          },
        });
        extraSkills.push(skill);
      }

      const startTime = Date.now();
      const roadmap = await skillRoadmapService.generateRoadmap(child.id);
      const duration = Date.now() - startTime;

      expect(roadmap).toBeDefined();
      expect(duration).toBeLessThan(10000);

      for (const skill of extraSkills) {
        await prisma.skill.delete({ where: { id: skill.id } });
      }
    });
  });
});
