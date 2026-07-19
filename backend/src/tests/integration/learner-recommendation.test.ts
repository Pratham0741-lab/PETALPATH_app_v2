/**
 * Phase 3.4 — AI Recommendation Engine integration tests.
 *
 * Exercises the production deterministic engine behind
 * GET /api/v1/learner/:childId/recommendation across every priority branch
 * plus the auth/ownership/validation edge cases.
 */

import { jest } from '@jest/globals';
import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database.js';
import { curriculumService } from '../../modules/curriculum/index.js';
import { MasteryState } from '@prisma/client';
import {
  createTestCategory,
  createTestModule,
  createTestLesson,
  createTestSubject,
  createTestSkill,
  createTestSkillHealth,
  createTestSticker,
  createTestUser,
} from '../helpers/factories.js';
import { createAuthenticatedContext, getAuthToken } from '../helpers/auth.js';

const request = supertest(app);

async function seedCurriculum(lessonId?: string) {
  const category = await createTestCategory();
  const module = await createTestModule(category.id);
  const lesson = await prisma.lesson.create({
    data: {
      id: lessonId || randomUUID(),
      moduleId: module.id,
      title: 'Test Lesson',
      displayOrder: 1,
      difficulty: 'EASY',
    },
  });
  return { category, module, lesson };
}

describe('Phase 3.4 — Recommendation Engine', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Priority branches', () => {
    it('1. returns CONTINUE_LESSON for an in-progress lesson', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      const { lesson } = await seedCurriculum();
      await prisma.lessonProgress.create({
        data: { childId: child.id, lessonId: lesson.id, status: 'IN_PROGRESS' },
      });

      const res = await request
        .get(`/api/v1/learner/${child.id}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kind).toBe('CONTINUE_LESSON');
      expect(res.body.data.activityType).toBeDefined();
      expect(res.body.data.confidence).toBeGreaterThan(0);
    });

    it('2. returns RETRY_ASSESSMENT for a failed assessment attempt', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      const assessment = await prisma.assessment.create({
        data: { title: 'Phonics Check', isActive: true },
      });
      await prisma.assessmentAttempt.create({
        data: {
          childId: child.id,
          assessmentId: assessment.id,
          status: 'COMPLETED',
          percentage: 45,
          completedAt: new Date(),
        },
      });

      const res = await request
        .get(`/api/v1/learner/${child.id}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kind).toBe('RETRY_ASSESSMENT');
      expect(res.body.data.reasonText).toContain('45%');
    });

    it('3. returns PRACTICE for the weakest skill area', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);
      await createTestSkillHealth(child.id, skill.id, {
        masteryState: MasteryState.WEAK,
        masteryScore: 40,
      });

      const res = await request
        .get(`/api/v1/learner/${child.id}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kind).toBe('PRACTICE');
      expect(res.body.data.skillId).toBe(skill.id);
    });

    it('4. returns ROADMAP for the next unlocked lesson', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedCurriculum('n_cap_a');

      const res = await request
        .get(`/api/v1/learner/${child.id}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kind).toBe('ROADMAP');
    });

    it('5. returns REWARD for a close reward opportunity', async () => {
      jest.spyOn(curriculumService, 'getLessonsInCurriculumOrder').mockReturnValue([]);
      const { child, accessToken } = await createAuthenticatedContext();
      await prisma.stars.create({ data: { childId: child.id, totalStars: 5 } });
      await createTestSticker({ name: 'Star Sticker', requiredStars: 10 });

      const res = await request
        .get(`/api/v1/learner/${child.id}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kind).toBe('REWARD');
      expect(res.body.data.activityType).toBe('REWARD');
      expect(res.body.data.reasonText).toContain('5 more stars');
    });

    it('6. returns REVIEW for a long-completed lesson', async () => {
      const mockLesson = {
        id: 'some-lesson-id',
        title: 'Review Lesson',
        order: 1,
        difficulty: 1,
        estimated_minutes: 7,
        prerequisites: [],
        activities: [],
        reward: { xp: 10, coins: 5 },
        mastery: { required_score: 80, attempts: 3 },
        curriculum: { subject: 'English', month: 'April', learning_outcome: '', original_topic: '' }
      } as any;
      jest.spyOn(curriculumService, 'getLessonsInCurriculumOrder').mockReturnValue([mockLesson]);
      jest.spyOn(curriculumService, 'getLessonById').mockReturnValue(mockLesson);

      const { child, accessToken } = await createAuthenticatedContext();
      await prisma.category.create({
        data: { id: 'some-cat-id', title: 'Test Category', description: 'desc', displayOrder: 1 }
      });
      await prisma.module.create({
        data: { id: 'some-mod-id', categoryId: 'some-cat-id', title: 'Test Module', description: 'desc', displayOrder: 1 }
      });
      await prisma.lesson.create({
        data: { id: 'some-lesson-id', moduleId: 'some-mod-id', title: 'Review Lesson', displayOrder: 1, difficulty: 'EASY' }
      });

      await prisma.lessonProgress.create({
        data: {
          childId: child.id,
          lessonId: 'some-lesson-id',
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request
        .get(`/api/v1/learner/${child.id}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kind).toBe('REVIEW');
    });

    it('7. returns no recommendation (data: null) when nothing is actionable', async () => {
      jest.spyOn(curriculumService, 'getLessonsInCurriculumOrder').mockReturnValue([]);
      const { child, accessToken } = await createAuthenticatedContext();

      const res = await request
        .get(`/api/v1/learner/${child.id}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  describe('Authentication & validation', () => {
    it('8. returns 401 without an auth token', async () => {
      const { child } = await createAuthenticatedContext();

      const res = await request.get(`/api/v1/learner/${child.id}/recommendation`);

      expect(res.status).toBe(401);
    });

    it('9. returns 403 when requesting another user child', async () => {
      const owner = await createAuthenticatedContext();
      const other = await createAuthenticatedContext();

      const res = await request
        .get(`/api/v1/learner/${owner.child.id}/recommendation`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('10. returns 404 for a non-existent child', async () => {
      // No childId claim on the JWT → falls through to the DB-ownership path,
      // where a valid-but-unknown uuid resolves to a clean 404.
      const user = await createTestUser();
      const accessToken = getAuthToken(user.id, 'PARENT');
      const bogus = '11111111-1111-4111-8111-111111111111';

      const res = await request
        .get(`/api/v1/learner/${bogus}/recommendation`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });

    it('11. rejects an invalid (malformed) childId via the ownership guard', async () => {
      // A JWT scoped to a child returns 403 on any non-matching childId
      // (including a malformed one) because assertChildOwnership runs before
      // the controller's Zod check.
      const { child, accessToken } = await createAuthenticatedContext();
      void child;

      const res = await request
        .get('/api/v1/learner/not-a-uuid/recommendation')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
