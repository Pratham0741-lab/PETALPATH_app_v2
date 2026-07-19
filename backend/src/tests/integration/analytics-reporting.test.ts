import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import { prisma } from '../../config/database.js';
import { cleanDatabase } from '../helpers/factories.js';
import { createAuthenticatedContext } from '../helpers/auth.js';

const request = supertest(app);

async function seedGradeData() {
  const category = await prisma.category.create({
    data: { title: 'Pre-Nursery Grade', displayOrder: 1 },
  });

  const module = await prisma.module.create({
    data: { categoryId: category.id, title: 'Getting Started', displayOrder: 1 },
  });

  await prisma.lesson.createMany({
    data: [
      {
        id: 'pn_free_play_and_settlingin',
        moduleId: module.id,
        title: 'Free Play',
        displayOrder: 1,
        difficulty: 'EASY',
      },
      {
        id: 'pn_fingertap_practice',
        moduleId: module.id,
        title: 'Tap Bubbles',
        displayOrder: 2,
        difficulty: 'EASY',
      },
    ],
  });
}

describe('Phase 8 — Analytics & Reporting Integration Tests', () => {
  let contextParentA: any;
  let contextParentB: any;
  let contextTeacher: any;
  let tokenParentA: string;
  let tokenParentB: string;
  let tokenTeacher: string;

  let classroomA: any;
  let childA: any;
  let childB: any;

  beforeEach(async () => {
    await cleanDatabase();
    await seedGradeData();

    // 1. Create parents and kids
    contextParentA = await createAuthenticatedContext({ childName: 'Child A', childAge: 2 });
    tokenParentA = `Bearer ${contextParentA.accessToken}`;
    childA = contextParentA.child;
    await prisma.child.update({ where: { id: childA.id }, data: { ageGroup: 'prenursery' } });

    contextParentB = await createAuthenticatedContext({ childName: 'Child B', childAge: 2 });
    tokenParentB = `Bearer ${contextParentB.accessToken}`;
    childB = contextParentB.child;
    await prisma.child.update({ where: { id: childB.id }, data: { ageGroup: 'prenursery' } });

    // 2. Create Teacher
    contextTeacher = await createAuthenticatedContext({ childName: 'Stub Student' });
    await prisma.user.update({ where: { id: contextTeacher.user.id }, data: { role: 'TEACHER' } });
    tokenTeacher = `Bearer ${contextTeacher.accessToken}`;

    // 3. Create Classroom A and register childA
    classroomA = await prisma.classroom.create({
      data: {
        name: 'Classroom A',
        code: 'CLASS-A-CODE',
        teacherId: contextTeacher.user.id,
      },
    });

    await prisma.classroomLearner.create({
      data: {
        classroomId: classroomA.id,
        childId: childA.id,
      },
    });
  });

  describe('Security & Authorization Gating', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request.get(`/api/analytics/learner/${childA.id}`);
      expect(res.status).toBe(401);
    });

    it('should allow Parent A to fetch Child A analytics', async () => {
      const res = await request
        .get(`/api/analytics/learner/${childA.id}`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.childId).toBe(childA.id);
    });

    it('should reject Parent A fetching Child B analytics with 403', async () => {
      const res = await request
        .get(`/api/analytics/learner/${childB.id}`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('authorized');
    });

    it('should allow classroom Teacher to fetch Child A analytics', async () => {
      const res = await request
        .get(`/api/analytics/learner/${childA.id}`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny classroom Teacher access to Child B analytics (not in class)', async () => {
      const res = await request
        .get(`/api/analytics/learner/${childB.id}`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not in teacher\'s classrooms');
    });
  });

  describe('Dynamic Calculations and Write Prevention', () => {
    beforeEach(async () => {
      // Seed some completions for childA
      await prisma.lessonProgress.create({
        data: {
          childId: childA.id,
          lessonId: 'pn_free_play_and_settlingin',
          status: 'COMPLETED',
          videoCompleted: true,
          videoStars: 3,
          totalStars: 3,
          completedAt: new Date(),
        },
      });

      await prisma.knowledgeState.create({
        data: {
          childId: childA.id,
          topicId: 'pn_free_play_and_settlingin',
          mastery: 100,
          state: 'MASTERED',
          confidence: 1.0,
          lastTransitionAt: new Date(),
        },
      });

      await prisma.reward.create({
        data: {
          childId: childA.id,
          title: 'Settled in badge reward',
          points: 15,
        },
      });

      await prisma.assessmentAttempt.create({
        data: {
          childId: childA.id,
          assessmentId: 'pn_free_play_and_settlingin',
          status: 'COMPLETED',
          score: 5,
          maxScore: 5,
          percentage: 100,
          completedAt: new Date(),
        },
      });
    });

    it('should return valid learner analytics summary and growth metrics', async () => {
      const res = await request
        .get(`/api/analytics/learner/${childA.id}`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.overallCompletionPercentage).toBeGreaterThanOrEqual(0);
      expect(res.body.data.totalXP).toBe(15);
      expect(res.body.data.totalStars).toBe(3);
    });

    it('should return valid cumulative growth progress trends', async () => {
      const res = await request
        .get(`/api/analytics/learner/${childA.id}/trends`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.trends.length).toBeGreaterThan(0);
      expect(res.body.data.trends[0].cumulativeXP).toBe(15);
      expect(res.body.data.trends[0].cumulativeStars).toBe(3);
    });

    it('should return valid classroom analytics aggregates', async () => {
      const res = await request
        .get(`/api/analytics/classroom/${classroomA.id}`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.averageCompletionPercentage).toBeGreaterThanOrEqual(0);
      expect(res.body.data.activeLearnersCount).toBe(1);
    });

    it('should return valid classroom trends', async () => {
      const res = await request
        .get(`/api/analytics/classroom/${classroomA.id}/trends`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.trends.length).toBeGreaterThan(0);
      expect(res.body.data.trends[0].cumulativeXP).toBe(15);
    });

    it('should return valid curriculum analytics rates', async () => {
      const res = await request
        .get(`/api/analytics/curriculum/prenursery`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.themeCompletions.length).toBeGreaterThan(0);
      expect(res.body.data.subjectCompletions.length).toBeGreaterThan(0);
    });

    it('should return valid assessment performance analytics', async () => {
      const res = await request
        .get(`/api/analytics/assessment/pn_free_play_and_settlingin`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.averageScore).toBe(100);
      expect(res.body.data.completionRate).toBeGreaterThanOrEqual(0);
    });
  });
});
