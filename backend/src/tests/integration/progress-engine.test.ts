import { prisma } from '../../config/database.js';
import { curriculumService, curriculumEngineService } from '../../modules/curriculum/index.js';
import { curriculumLoader } from '../../modules/curriculum/curriculum-loader.js';
import { progressService } from '../../modules/progress/progress.service.js';
import { rewardService } from '../../modules/rewards/rewards.service.js';
import { cleanDatabase } from '../helpers/factories.js';
import { jest } from '@jest/globals';
import { engineConfig } from '../../shared/config/engine.config.js';

async function seedCurriculumForTests() {
  const allCurricula = curriculumLoader.loadAllCurricula();
  for (const [gradeKey, cur] of allCurricula.entries()) {
    const category = await prisma.category.create({
      data: {
        title: cur.grade.name,
        description: cur.grade.description,
        displayOrder: gradeKey === 'prenursery' ? 1 : gradeKey === 'nursery' ? 2 : gradeKey === 'lkg' ? 3 : 4,
      },
    });

    for (const theme of cur.themes) {
      const module = await prisma.module.create({
        data: {
          categoryId: category.id,
          title: theme.title,
          description: `Theme: ${theme.title}`,
          displayOrder: theme.order,
        },
      });

      for (const node of theme.nodes) {
        const difficultyString = node.difficulty <= 2 ? 'EASY' : node.difficulty <= 4 ? 'MEDIUM' : 'HARD';
        await prisma.lesson.create({
          data: {
            id: node.id,
            moduleId: module.id,
            title: node.title,
            description: node.curriculum.learning_outcome,
            displayOrder: node.order,
            difficulty: difficultyString,
          },
        });
      }
    }
  }
}

describe('Phase 3 — Student Progress & Learning Engine Tests', () => {
  let user: any;
  let child: any;

  beforeEach(async () => {
    await cleanDatabase();
    await seedCurriculumForTests();

    // Setup parent/child profiles
    user = await prisma.user.create({
      data: { email: 'progress_tester@example.com', name: 'Parent', role: 'PARENT' },
    });
    // Start child in prenursery
    child = await prisma.child.create({
      data: { userId: user.id, name: 'Tester', age: 2, ageGroup: 'prenursery', avatar: 'panda' },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CurriculumEngineService (Stateless logic)', () => {
    it('should unlock the first lesson in the grade by default', () => {
      const gradeLessons = curriculumService.getLessonsInCurriculumOrder('prenursery');
      const firstLesson = gradeLessons[0];
      const isUnlocked = curriculumEngineService.isLessonUnlocked(
        firstLesson.id,
        gradeLessons,
        [],
        []
      );
      expect(isUnlocked).toBe(true);
    });

    it('should evaluate lesson unlock correctly based on completed prerequisites', () => {
      const gradeLessons = curriculumService.getLessonsInCurriculumOrder('prenursery');
      // Let's find a lesson that has prerequisites
      const lessonWithPrereqs = gradeLessons.find(
        (n) => n.prerequisites && n.prerequisites.length > 0
      );
      if (!lessonWithPrereqs) return; // skip if no prerequisites defined in CBSE prenursery

      const prereqId = lessonWithPrereqs.prerequisites[0];

      // Initially locked
      let isUnlocked = curriculumEngineService.isLessonUnlocked(
        lessonWithPrereqs.id,
        gradeLessons,
        [],
        []
      );
      expect(isUnlocked).toBe(false);

      // Prerequisite in progress but not completed -> remains locked
      isUnlocked = curriculumEngineService.isLessonUnlocked(
        lessonWithPrereqs.id,
        gradeLessons,
        [{ lessonId: prereqId, status: 'IN_PROGRESS' }],
        []
      );
      expect(isUnlocked).toBe(false);

      // Prerequisite completed -> unlocked
      isUnlocked = curriculumEngineService.isLessonUnlocked(
        lessonWithPrereqs.id,
        gradeLessons,
        [{ lessonId: prereqId, status: 'COMPLETED' }],
        [{ topicId: prereqId, mastery: 80 }]
      );
      expect(isUnlocked).toBe(true);
    });

    it('should evaluate lesson unlock correctly based on prerequisite mastery thresholds', () => {
      /*
       * Rule changed in 85806ba (2026-08-27), unlock-policy.ts: one policy for
       * every gate. A finished prerequisite unlocks the lesson once the weighted
       * prerequisite mastery reaches min(node required_score,
       * unified.unlock.weightedThreshold) and no prerequisite is below
       * perPrerequisiteFloor. It used to require every prerequisite to reach the
       * node's required_score (80); the threshold is now 70.
       */
      const gradeLessons = curriculumService.getLessonsInCurriculumOrder('prenursery');
      const lessonWithMasteryPrereq = gradeLessons.find(
        (n) => n.prerequisites && n.prerequisites.length === 1 && n.mastery
      );
      if (!lessonWithMasteryPrereq) return;

      const prereqId = lessonWithMasteryPrereq.prerequisites[0];
      const threshold = Math.min(
        lessonWithMasteryPrereq.mastery.required_score,
        engineConfig.unified.unlock.weightedThreshold,
      );
      const check = (mastery: number, status = 'COMPLETED') =>
        curriculumEngineService.isLessonUnlocked(
          lessonWithMasteryPrereq.id,
          gradeLessons,
          [{ lessonId: prereqId, status }],
          [{ topicId: prereqId, mastery }]
        );

      expect(check(threshold - 1)).toBe(false); // completed, below the threshold
      expect(check(threshold)).toBe(true); // completed, at the threshold
      expect(check(100, 'IN_PROGRESS')).toBe(false); // not finished: locked whatever the score
    });

    it('should determine the next available lesson correctly', () => {
      const gradeLessons = curriculumService.getLessonsInCurriculumOrder('prenursery');
      const nextLesson = curriculumEngineService.determineNextAvailableLesson(
        gradeLessons,
        [],
        []
      );
      expect(nextLesson).toBe(gradeLessons[0].id);

      const nextLessonAfterFirst = curriculumEngineService.determineNextAvailableLesson(
        gradeLessons,
        [{ lessonId: gradeLessons[0].id, status: 'COMPLETED' }],
        [{ topicId: gradeLessons[0].id, mastery: 80 }]
      );
      expect(nextLessonAfterFirst).toBe(gradeLessons[1].id);
    });
  });

  describe('Lesson Progression and Completion Persistence', () => {
    it('should transition lesson progress to COMPLETED and award rewards idempotently', async () => {
      const lessonId = 'pn_free_play_and_settlingin'; // first lesson of prenursery
      const node = curriculumService.getLessonById(lessonId)!;

      // Seed knowledge state to satisfy mastery requirement
      await prisma.knowledgeState.create({
        data: {
          childId: child.id,
          topicId: lessonId,
          mastery: 85.0,
          confidence: 1.0,
          lastTransitionAt: new Date(),
        },
      });

      // Complete activities one by one
      const requiredTypes = node.activities.map((a) => a.type);
      for (let i = 0; i < requiredTypes.length; i++) {
        const type = requiredTypes[i];
        await progressService.updateActivityCompletion(child.id, lessonId, type, 3);

        const currentProgress = await progressService.getByChildAndLesson(child.id, lessonId);
        if (i < requiredTypes.length - 1) {
          expect(currentProgress?.status).toBe('IN_PROGRESS');
        } else {
          // All activities completed -> lesson becomes completed
          expect(currentProgress?.status).toBe('COMPLETED');
        }
      }

      // Check that a reward is created in the database
      const reward = await prisma.reward.findFirst({
        where: { childId: child.id, title: `Lesson Completed: ${lessonId}` },
      });
      expect(reward).toBeDefined();
      expect(reward?.points).toBe(node.reward.xp);

      // Verify reward persistence is idempotent: calling updateActivityCompletion again should not add a duplicate reward
      const initialRewardsCount = await prisma.reward.count({ where: { childId: child.id } });
      await progressService.updateActivityCompletion(child.id, lessonId, requiredTypes[0], 3);
      const newRewardsCount = await prisma.reward.count({ where: { childId: child.id } });
      expect(newRewardsCount).toBe(initialRewardsCount);
    });

    it('completes a lesson on coverage alone, whatever its mastery score', async () => {
      /*
       * Rule changed in 85806ba (2026-08-27), progress.service.ts: completion is
       * coverage only. It used to also require KnowledgeState.mastery >= the
       * node's required_score, but that mastery is scored *from* the
       * completion, so such a lesson could never finish. A thin pass now
       * completes and scores low, which puts it in the review queue.
       */
      const lessonId = 'pn_fingertap_practice'; // declares required_score = 80
      const node = curriculumService.getLessonById(lessonId)!;
      const requiredTypes = node.activities.map((a) => a.type);

      // A low existing mastery does not hold completion back.
      await prisma.knowledgeState.create({
        data: { childId: child.id, topicId: lessonId, mastery: 50.0, confidence: 1.0, lastTransitionAt: new Date() },
      });

      // Only the first activity done: not covered yet.
      await progressService.updateActivityCompletion(child.id, lessonId, requiredTypes[0], 3);
      const partial = await progressService.getByChildAndLesson(child.id, lessonId);
      expect(partial?.status).toBe('IN_PROGRESS');

      // Every activity done: complete, although mastery is still 50.
      for (const type of requiredTypes) {
        await progressService.updateActivityCompletion(child.id, lessonId, type, 3);
      }
      const progress = await progressService.getByChildAndLesson(child.id, lessonId);
      expect(progress?.status).toBe('COMPLETED');
    });

    it('should support forceCompleteLesson for admin/testing by mock completing activities and satisfying mastery', async () => {
      const lessonId = 'pn_fingertap_practice';
      const node = curriculumService.getLessonById(lessonId)!;

      const result = await progressService.forceCompleteLesson(child.id, lessonId);
      expect(result.becameCompleted).toBe(true);
      expect(result.progress.status).toBe('COMPLETED');

      // Verify KnowledgeState has been created with target mastery
      const ks = await prisma.knowledgeState.findFirst({
        where: { childId: child.id, topicId: lessonId },
      });
      expect(ks).toBeDefined();
      expect(ks?.mastery).toBe(node.mastery.required_score);
    });
  });

  describe('Grade Progression', () => {
    it('should trigger grade progression to the next grade label upon completing the last lesson', async () => {
      const gradeLessons = curriculumService.getLessonsInCurriculumOrder('prenursery');
      const lastLesson = gradeLessons[gradeLessons.length - 1];

      // Force complete all lessons in prenursery except the last one
      for (let i = 0; i < gradeLessons.length - 1; i++) {
        await progressService.forceCompleteLesson(child.id, gradeLessons[i].id);
      }

      let childProfile = await prisma.child.findUnique({ where: { id: child.id } });
      expect(childProfile?.ageGroup).toBe('prenursery');

      // Force complete the last lesson
      await progressService.forceCompleteLesson(child.id, lastLesson.id);

      // Child should progress to the next grade's age group label (nursery = 3–4 years)
      childProfile = await prisma.child.findUnique({ where: { id: child.id } });
      expect(childProfile?.ageGroup).toBe('3–4 years');
    });
  });

  describe('Transaction Safety and Rollback Validation', () => {
    it('should roll back the entire transaction if a downstream operation fails', async () => {
      const lessonId = 'pn_free_play_and_settlingin';
      const node = curriculumService.getLessonById(lessonId)!;
      const requiredTypes = node.activities.map((a) => a.type);

      // Complete all activities except the last one
      for (let i = 0; i < requiredTypes.length - 1; i++) {
        await progressService.updateActivityCompletion(child.id, lessonId, requiredTypes[i], 3);
      }

      // Mock rewardService.refreshRewards to throw an error, simulating a crash during completion
      jest.spyOn(rewardService, 'refreshRewards').mockRejectedValueOnce(new Error('Simulated DB failure'));

      // Attempt to complete the last activity (which triggers lesson completion and reward refresh)
      let threw = false;
      try {
        await progressService.updateActivityCompletion(child.id, lessonId, requiredTypes[requiredTypes.length - 1], 3);
      } catch (err) {
        threw = true;
      }
      expect(threw).toBe(true);

      // Verify transaction rollback: lesson status must remain IN_PROGRESS and no rewards earned
      const currentProgress = await progressService.getByChildAndLesson(child.id, lessonId);
      expect(currentProgress?.status).toBe('IN_PROGRESS');

      const rewardsCount = await prisma.reward.count({ where: { childId: child.id } });
      expect(rewardsCount).toBe(0);
    });
  });
});
