import { prisma } from '../../config/database.js';
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

describe('Placement Assessment', () => {
  let user: any;
  let child: any;
  let subject: any;
  let rootSkill: any;
  let assessment: any;
  let prerequisiteSkill: any;
  let unassessedSkill: any;

  beforeAll(async () => {
    user = await createTestUser();
    child = await createTestChild(user.id);
    subject = await createTestSubject();

    rootSkill = await prisma.skill.create({
      data: {
        name: 'Placement Test Skill',
        skillCode: 'PLACEMENT_TEST_SKILL',
        subjectId: subject.id,
        difficulty: 1,
        isRootSkill: true,
        displayOrder: 1,
      },
    });

    prerequisiteSkill = await prisma.skill.create({
      data: {
        name: 'Prerequisite Skill',
        skillCode: 'PREREQ_SKILL',
        subjectId: subject.id,
        difficulty: 1,
        isRootSkill: false,
        displayOrder: 2,
      },
    });

    unassessedSkill = await prisma.skill.create({
      data: {
        name: 'Unassessed Skill',
        skillCode: 'UNASSESSED_SKILL',
        subjectId: subject.id,
        difficulty: 1,
        isRootSkill: false,
        displayOrder: 3,
      },
    });

    await prisma.skillDependency.create({
      data: {
        parentSkillId: prerequisiteSkill.id,
        childSkillId: rootSkill.id,
        weight: 1,
      },
    });

    assessment = await createPlacementAssessment('PRE_NURSERY', subject.id, rootSkill.id);
  });

  afterAll(async () => {
    await prisma.skillDependency.deleteMany({
      where: { OR: [{ childSkillId: rootSkill.id }, { childSkillId: prerequisiteSkill.id }] },
    });
    await prisma.assessmentAttempt.deleteMany({ where: { childId: child.id } });
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });
    await prisma.assessment.delete({ where: { id: assessment.id } });
    await prisma.skillHealth.deleteMany({ where: { childId: child.id } });
    await prisma.childSkillCurriculum.deleteMany({ where: { childId: child.id } });
    await prisma.reinforcementQueue.deleteMany({ where: { childId: child.id } });
    await prisma.dynamicRoadmap.deleteMany({ where: { childId: child.id } });
    await prisma.skill.delete({ where: { id: unassessedSkill.id } });
    await prisma.skill.delete({ where: { id: prerequisiteSkill.id } });
    await prisma.skill.delete({ where: { id: rootSkill.id } });
    await prisma.subject.delete({ where: { id: subject.id } });
    await prisma.child.delete({ where: { id: child.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  describe('getQuestionnaire', () => {
    it('should return questionnaire for valid age group', async () => {
      const result = await placementService.getQuestionnaire('PRE_NURSERY');

      expect(result).toBeDefined();
      expect(result.assessmentId).toBe(assessment.id);
      expect(result.totalQuestions).toBe(2);
      expect(result.questions).toHaveLength(2);
    });

    it('should return start-from-beginning when flag is set', async () => {
      const result = await placementService.getQuestionnaire(undefined, true);

      expect(result.assessmentId).toBe('start_from_beginning');
      expect(result.totalQuestions).toBe(0);
    });

    it('should return default questionnaire when no age group specified', async () => {
      const result = await placementService.getQuestionnaire();

      expect(result).toBeDefined();
      expect(result.assessmentId).toBe(assessment.id);
    });

    it('should throw NotFoundError for unknown age group', async () => {
      await expect(placementService.getQuestionnaire('UNKNOWN_GROUP'))
        .rejects
        .toThrow('No placement assessment found for age group: UNKNOWN_GROUP');
    });
  });

  describe('startPlacement', () => {
    it('should start a new placement attempt', async () => {
      const progress = await placementService.startPlacement(child.id, assessment.id);

      expect(progress).toBeDefined();
      expect(progress.attemptId).toBeDefined();
      expect(progress.totalQuestions).toBe(2);
      expect(progress.answeredQuestions).toBe(0);
      expect(progress.isComplete).toBe(false);
      expect(progress.currentQuestion).toBeDefined();
      expect(progress.currentQuestion!.id).toBe(assessment.questions[0].id);
    });

    it('should resume existing in-progress attempt', async () => {
      const progress = await placementService.startPlacement(child.id, assessment.id);

      expect(progress.attemptId).toBeDefined();
    });

    it('should throw NotFoundError for non-existent assessment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(placementService.startPlacement(child.id, fakeId))
        .rejects
        .toThrow('Assessment not found');
    });
  });

  describe('submitAnswer', () => {
    let attemptProgress: any;

    beforeEach(async () => {
      await placementService.restartPlacement(child.id);
      attemptProgress = await placementService.startPlacement(child.id, assessment.id);
    });

    it('should mark correct answer', async () => {
      const result = await placementService.submitAnswer(
        child.id,
        attemptProgress.attemptId,
        attemptProgress.currentQuestion!.id,
        '2'
      );

      expect(result.correct).toBe(true);
      expect(result.progress.answeredQuestions).toBe(1);
    });

    it('should mark incorrect answer', async () => {
      const result = await placementService.submitAnswer(
        child.id,
        attemptProgress.attemptId,
        attemptProgress.currentQuestion!.id,
        '1'
      );

      expect(result.correct).toBe(false);
    });

    it('should advance to next question after answer', async () => {
      const firstResult = await placementService.submitAnswer(
        child.id,
        attemptProgress.attemptId,
        attemptProgress.currentQuestion!.id,
        '2'
      );

      expect(firstResult.progress.currentQuestionIndex).toBe(1);
      expect(firstResult.progress.currentQuestion!.id).toBe(assessment.questions[1].id);
    });

    it('should reject answer for completed attempt', async () => {
      await placementService.submitAnswer(
        child.id,
        attemptProgress.attemptId,
        assessment.questions[0].id,
        '2'
      );
      await placementService.submitAnswer(
        child.id,
        attemptProgress.attemptId,
        assessment.questions[1].id,
        '4'
      );

      await expect(
        placementService.submitAnswer(
          child.id,
          attemptProgress.attemptId,
          assessment.questions[0].id,
          '2'
        )
      ).rejects.toThrow('already been answered');
    });

    it('should throw NotFoundError for non-existent attempt', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        placementService.submitAnswer(child.id, fakeId, assessment.questions[0].id, '2')
      ).rejects.toThrow('Placement attempt not found');
    });
  });

  describe('completePlacement', () => {
    it('should complete placement and initialize curriculum', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);

      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');

      const result = await placementService.completePlacement(child.id, progress.attemptId);

      expect(result.masteredCount).toBe(1);
      expect(result.curriculumInitialized).toBe(true);

      const curriculum = await placementRepository.findChildSkillCurriculums(child.id);
      expect(curriculum.length).toBeGreaterThanOrEqual(1);

      const health = await placementRepository.findSkillHealths(child.id);
      expect(health.length).toBeGreaterThanOrEqual(1);
    });

    it('should create reinforcement queue for weak skills', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);

      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '1');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '3');

      const result = await placementService.completePlacement(child.id, progress.attemptId);

      const queues = await placementRepository.findReinforcementQueues(child.id);
      expect(queues.length).toBe(result.revisionQueueCount);
    });

    it('should generate roadmap after completion', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);

      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');

      const result = await placementService.completePlacement(child.id, progress.attemptId);

      expect(result.roadmapGenerated).toBe(true);

      const roadmap = await placementRepository.findDynamicRoadmap(child.id);
      expect(roadmap).toBeDefined();
    });

    it('should throw ConflictError for already completed attempt', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);

      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');

      await placementService.completePlacement(child.id, progress.attemptId);

      await expect(
        placementService.completePlacement(child.id, progress.attemptId)
      ).rejects.toThrow('already completed');
    });
  });

  describe('startFromBeginning', () => {
    it('should initialize child at root skills', async () => {
      await placementService.restartPlacement(child.id);
      const result = await placementService.startFromBeginning(child.id);

      expect(result.result.curriculumInitialized).toBe(true);
      expect(result.result.roadmapGenerated).toBe(true);

      const curriculum = await placementRepository.findChildSkillCurriculums(child.id);
      expect(curriculum.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getPlacementResult', () => {
    it('should return existing placement result', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);

      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');

      await placementService.completePlacement(child.id, progress.attemptId);

      const result = await placementService.getPlacementResult(child.id, progress.attemptId);
      expect(result.curriculumInitialized).toBe(true);
    });

    it('should throw NotFoundError for non-existent attempt', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        placementService.getPlacementResult(child.id, fakeId)
      ).rejects.toThrow('Placement attempt not found');
    });
  });

  describe('restartPlacement', () => {
    it('should clear all placement data for child', async () => {
      await placementService.restartPlacement(child.id);

      const curriculum = await placementRepository.findChildSkillCurriculums(child.id);
      expect(curriculum).toHaveLength(0);

      const health = await placementRepository.findSkillHealths(child.id);
      expect(health).toHaveLength(0);
    });
  });

  describe('concurrent startPlacement (H2)', () => {
    it('should return same attempt on subsequent calls', async () => {
      await placementService.restartPlacement(child.id);
      const first = await placementService.startPlacement(child.id, assessment.id);
      const second = await placementService.startPlacement(child.id, assessment.id);

      expect(second.attemptId).toBe(first.attemptId);
    });
  });

  describe('prerequisite gap detection (C2)', () => {
    it('should detect prerequisite gaps for LEARNING skills', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);

      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '1');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');

      const result = await placementService.completePlacement(child.id, progress.attemptId);

      const prereqGap = result.prerequisiteGaps.find((g) => g.skillId === prerequisiteSkill.id);
      expect(prereqGap).toBeDefined();
      expect(prereqGap!.skillName).toBe('Prerequisite Skill');
    });
  });

  describe('full curriculum initialization (C3)', () => {
    it('should create LOCKED entries for unassessed skills', async () => {
      await placementService.restartPlacement(child.id);
      const progress = await placementService.startPlacement(child.id, assessment.id);

      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[0].id, '2');
      await placementService.submitAnswer(child.id, progress.attemptId, assessment.questions[1].id, '4');

      await placementService.completePlacement(child.id, progress.attemptId);

      const curriculum = await placementRepository.findChildSkillCurriculums(child.id);
      const unassessed = curriculum.find((c) => c.skillId === unassessedSkill.id);
      expect(unassessed).toBeDefined();
      expect(unassessed!.state).toBe('LOCKED');
    });
  });
});
