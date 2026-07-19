import { prisma } from '../../config/database.js';
import { curriculumService } from '../../modules/curriculum/curriculum.service.js';
import { lessonsService } from '../../modules/lessons/lessons.service.js';
import { roadmapService } from '../../modules/roadmap/roadmap.service.js';
import { moduleProgressService } from '../../modules/progress/module-progress.service.js';
import { progressService } from '../../modules/progress/progress.service.js';
import { cleanDatabase } from '../helpers/factories.js';

describe('Curriculum-Driven Backend - Integration Tests (Phase 2)', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('CurriculumService & Read-only API Metadata Checks', () => {
    it('should retrieve grade curriculum with deeply recursively frozen properties', () => {
      const cur = curriculumService.getCurriculumByGrade('prenursery');
      expect(cur).toBeDefined();
      expect(cur?.grade.name).toBe('Pre-Nursery');
      expect(Object.isFrozen(cur)).toBe(true);
      expect(Object.isFrozen(cur?.themes)).toBe(true);
    });

    it('should retrieve lessons filtered correctly by subject', () => {
      const mathLessons = curriculumService.getLessonsBySubject('prenursery', 'Maths');
      expect(mathLessons.length).toBeGreaterThan(0);
      mathLessons.forEach((l) => {
        expect(l.curriculum.subject).toBe('Maths');
      });
    });

    it('should retrieve lessons filtered correctly by month', () => {
      const month1Lessons = curriculumService.getLessonsByMonth('prenursery', 'April');
      expect(month1Lessons.length).toBeGreaterThan(0);
      month1Lessons.forEach((l) => {
        expect(l.curriculum.month).toBe('April');
      });
    });

    it('should retrieve correct reward information as Readonly', () => {
      // Find a lesson with reward defined
      const lesson = curriculumService.getLessonById('pn_settlingin_comfort');
      expect(lesson).toBeDefined();
      const reward = curriculumService.getReward('pn_settlingin_comfort');
      expect(reward).toBeDefined();
      expect(reward?.xp).toBe(10);
      expect(reward?.coins).toBe(5);
      expect(Object.isFrozen(reward)).toBe(true);
    });

    it('should retrieve correct mastery threshold parameters as Readonly', () => {
      const mastery = curriculumService.getMastery('pn_fingertap_practice');
      expect(mastery).toBeDefined();
      expect(mastery?.required_score).toBe(80);
      expect(mastery?.attempts).toBe(3);
      expect(Object.isFrozen(mastery)).toBe(true);
    });
  });

  describe('Downstream Backend Modules Gated Read-Only Integrity', () => {
    it('should ensure every backend service retrieves identical lesson metadata from CurriculumService', async () => {
      const lessonId = 'pn_free_play_and_settlingin';

      // 1. Retrieve from CurriculumService
      const nodeMetadata = curriculumService.getLessonById(lessonId);
      expect(nodeMetadata).toBeDefined();

      // 2. Retrieve from LessonsService
      const lessonsNode = await lessonsService.getLessonById(lessonId);
      expect(lessonsNode).toBeDefined();
      expect(lessonsNode?.title).toBe(nodeMetadata?.title);
      expect(lessonsNode?.description).toBe(nodeMetadata?.curriculum.learning_outcome);

      // Verify that no local copy divergence exists
      expect(lessonsNode?.id).toBe(nodeMetadata?.id);
    });

    it('should throw write operation errors on read-only LessonsService', async () => {
      await expect(lessonsService.createLesson({} as any)).rejects.toThrow(
        /Curriculum metadata is read-only/
      );
      await expect(lessonsService.updateLesson('some-id', {} as any)).rejects.toThrow(
        /Curriculum metadata is read-only/
      );
      await expect(lessonsService.deleteLesson('some-id')).rejects.toThrow(
        /Curriculum metadata is read-only/
      );
    });
  });

  describe('RoadmapService & Zero Runtime DB Sync', () => {
    it('should return visual roadmap structure with correct unlock states and zero DB writes', async () => {
      // Setup test user/child
      const user = await prisma.user.create({
        data: { email: 'child_tester@example.com', name: 'Parent', role: 'PARENT' },
      });
      const child = await prisma.child.create({
        data: { userId: user.id, name: 'Tester', age: 3, ageGroup: 'PRE_K', avatar: 'panda' },
      });

      // Count Category, Module, Lesson, and Activity tables before requesting roadmap
      const catCountBefore = await prisma.category.count();
      const modCountBefore = await prisma.module.count();
      const lesCountBefore = await prisma.lesson.count();
      const actCountBefore = await prisma.activity.count();

      // Get roadmap
      const roadmap = await roadmapService.getRoadmap(child.id);
      expect(roadmap).toBeDefined();
      expect(roadmap.grade).toBe('Pre-Nursery');
      expect(roadmap.themes.length).toBeGreaterThan(0);

      // Assert zero database writes/inserts occurred during retrieval
      expect(await prisma.category.count()).toBe(catCountBefore);
      expect(await prisma.module.count()).toBe(modCountBefore);
      expect(await prisma.lesson.count()).toBe(lesCountBefore);
      expect(await prisma.activity.count()).toBe(actCountBefore);

      // First node in the grade should be unlocked by default
      const firstNode = roadmap.nodes[0];
      expect(firstNode.isUnlocked).toBe(true);
      expect(firstNode.isCompleted).toBe(false);
    });
  });
});
