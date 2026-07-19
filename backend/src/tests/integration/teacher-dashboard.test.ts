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

describe('Phase 7 — Teacher Dashboard & Classroom Insights Integration Tests', () => {
  let contextTeacher: any;
  let contextOtherTeacher: any;
  let contextParent: any;
  let tokenTeacher: string;
  let tokenOtherTeacher: string;
  let tokenParent: string;

  let classroomA: any;
  let classroomB: any;
  let childInA: any;
  let childInB: any;

  beforeEach(async () => {
    await cleanDatabase();
    await seedGradeData();

    // 1. Create Teacher account
    contextTeacher = await createAuthenticatedContext({
      childName: 'Stub Student', // will ignore this child
    });
    // Set role to TEACHER
    await prisma.user.update({
      where: { id: contextTeacher.user.id },
      data: { role: 'TEACHER' },
    });
    tokenTeacher = `Bearer ${contextTeacher.accessToken}`;

    // 2. Create another Teacher account
    contextOtherTeacher = await createAuthenticatedContext({
      childName: 'Stub Student 2',
    });
    await prisma.user.update({
      where: { id: contextOtherTeacher.user.id },
      data: { role: 'TEACHER' },
    });
    tokenOtherTeacher = `Bearer ${contextOtherTeacher.accessToken}`;

    // 3. Create a Parent account
    contextParent = await createAuthenticatedContext({
      childName: 'Parent Child',
    });
    tokenParent = `Bearer ${contextParent.accessToken}`;

    // 4. Create Classroom A and enroll Child A
    classroomA = await prisma.classroom.create({
      data: {
        name: 'Classroom A',
        code: 'CLASS-A-CODE',
        teacherId: contextTeacher.user.id,
      },
    });

    const parentOfA = await createAuthenticatedContext({ childName: 'Child A', childAge: 2 });
    childInA = parentOfA.child;
    await prisma.child.update({
      where: { id: childInA.id },
      data: { ageGroup: 'prenursery' },
    });

    await prisma.classroomLearner.create({
      data: {
        classroomId: classroomA.id,
        childId: childInA.id,
      },
    });

    // 5. Create Classroom B and enroll Child B
    classroomB = await prisma.classroom.create({
      data: {
        name: 'Classroom B',
        code: 'CLASS-B-CODE',
        teacherId: contextOtherTeacher.user.id,
      },
    });

    const parentOfB = await createAuthenticatedContext({ childName: 'Child B', childAge: 2 });
    childInB = parentOfB.child;
    await prisma.child.update({
      where: { id: childInB.id },
      data: { ageGroup: 'prenursery' },
    });

    await prisma.classroomLearner.create({
      data: {
        classroomId: classroomB.id,
        childId: childInB.id,
      },
    });
  });

  describe('Security & Authorization Gating', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request.get(`/api/teacher/dashboard/classroom/${classroomA.id}`);
      expect(res.status).toBe(401);
    });

    it('should reject non-teacher parent role with 403', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}`)
        .set('Authorization', tokenParent);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Teacher role required');
    });

    it('should allow authorized teacher to access their own classroom', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Classroom A');
    });

    it('should reject teacher access to other classroom with 403', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomB.id}`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Not authorized for this classroom');
    });

    it('should deny teacher access to a learner progress query if learner is not in their classrooms', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}/learner/${childInB.id}`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Learner not in teacher\'s classrooms');
    });
  });

  describe('Dynamic Classroom Analytics & Progress Calculations', () => {
    beforeEach(async () => {
      // Seed progress for childInA to trigger active counts
      await prisma.lessonProgress.create({
        data: {
          childId: childInA.id,
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
          childId: childInA.id,
          topicId: 'pn_free_play_and_settlingin',
          mastery: 100,
          state: 'MASTERED',
          confidence: 1.0,
          lastTransitionAt: new Date(),
        },
      });

      await prisma.reward.create({
        data: {
          childId: childInA.id,
          title: 'Lesson Completed Reward',
          points: 10,
        },
      });

      // Seed Badge and Sticker
      const badge = await prisma.badge.create({
        data: { name: 'Mastery Badge', description: 'm', iconKey: 'b.png' },
      });
      await prisma.childBadge.create({
        data: { childId: childInA.id, badgeId: badge.id },
      });
    });

    it('should calculate active learners and completion percentages correctly', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.totalLearners).toBe(1);
      expect(res.body.data.activeLearners).toBe(1); // childInA is active
      expect(res.body.data.classroomCompletionPercentage).toBeGreaterThanOrEqual(0);
      expect(res.body.data.learners[0].active).toBe(true);
    });

    it('should return theme progress averages', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}/themes`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].averageCompletionPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should return subject progress averages', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}/subjects`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].averageCompletionPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate classroom achievements (XP, stars, badges, stickers)', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}/achievements`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.totalXP).toBe(10);
      expect(res.body.data.totalStars).toBe(3);
      expect(res.body.data.totalBadges).toBe(1);
    });

    it('should average classroom mastery and subject mastery correctly', async () => {
      const res = await request
        .get(`/api/teacher/dashboard/classroom/${classroomA.id}/mastery`)
        .set('Authorization', tokenTeacher);

      expect(res.status).toBe(200);
      expect(res.body.data.overallClassroomMastery).toBeGreaterThanOrEqual(0);
      expect(res.body.data.subjectMastery.length).toBeGreaterThan(0);
      expect(res.body.data.studentMastery.length).toBe(1);
    });
  });

  describe('Empty Classroom Fallback Behaviours', () => {
    let emptyClassroom: any;

    beforeEach(async () => {
      emptyClassroom = await prisma.classroom.create({
        data: {
          name: 'Empty Classroom',
          code: 'CLASS-EMPTY',
          teacherId: contextTeacher.user.id,
        },
      });
    });

    it('should return 0 averages and empty arrays instead of nulls when classroom has no learners', async () => {
      const dashboardRes = await request
        .get(`/api/teacher/dashboard/classroom/${emptyClassroom.id}`)
        .set('Authorization', tokenTeacher);

      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.body.data.totalLearners).toBe(0);
      expect(dashboardRes.body.data.activeLearners).toBe(0);
      expect(dashboardRes.body.data.learners).toEqual([]);

      const progressRes = await request
        .get(`/api/teacher/dashboard/classroom/${emptyClassroom.id}/progress`)
        .set('Authorization', tokenTeacher);

      expect(progressRes.status).toBe(200);
      expect(progressRes.body.data.averageCompletionPercentage).toBe(0);

      const themeRes = await request
        .get(`/api/teacher/dashboard/classroom/${emptyClassroom.id}/themes`)
        .set('Authorization', tokenTeacher);

      expect(themeRes.status).toBe(200);
      expect(themeRes.body.data).toEqual([]);
    });
  });
});
