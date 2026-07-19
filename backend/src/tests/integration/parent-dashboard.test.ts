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

describe('Phase 6 — Parent Dashboard & Learner Insights Integration Tests', () => {
  let contextParentA: any;
  let contextParentB: any;
  let tokenParentA: string;
  let tokenParentB: string;

  beforeEach(async () => {
    await cleanDatabase();
    await seedGradeData();

    // 1. Create Parent A and linked Child A
    contextParentA = await createAuthenticatedContext({
      childName: 'Child A',
      childAge: 2,
    });
    tokenParentA = `Bearer ${contextParentA.accessToken}`;
    await prisma.child.update({
      where: { id: contextParentA.child.id },
      data: { ageGroup: 'prenursery' },
    });

    // 2. Create Parent B and linked Child B
    contextParentB = await createAuthenticatedContext({
      childName: 'Child B',
      childAge: 2,
    });
    tokenParentB = `Bearer ${contextParentB.accessToken}`;
    await prisma.child.update({
      where: { id: contextParentB.child.id },
      data: { ageGroup: 'prenursery' },
    });
  });

  describe('Security & Authorization Gating', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request.get(`/api/dashboard/${contextParentA.child.id}`);
      expect(res.status).toBe(401);
    });

    it('should allow Parent A to retrieve Child A dashboard', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grade.id).toBe('pre_nursery');
    });

    it('should deny Parent A access to Child B dashboard with 403', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentB.child.id}`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('authorized');
    });
  });

  describe('Dynamic Insights Retrieval', () => {
    beforeEach(async () => {
      // Seed progress and states for Child A
      await prisma.lessonProgress.create({
        data: {
          childId: contextParentA.child.id,
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
          childId: contextParentA.child.id,
          topicId: 'pn_free_play_and_settlingin',
          mastery: 100,
          state: 'MASTERED',
          confidence: 1.0,
          lastTransitionAt: new Date(),
        },
      });

      await prisma.reward.create({
        data: {
          childId: contextParentA.child.id,
          title: 'Lesson Completed: pn_free_play_and_settlingin',
          points: 10,
        },
      });

      // Seed a completed assessment attempt for Child A
      await prisma.assessmentAttempt.create({
        data: {
          childId: contextParentA.child.id,
          assessmentId: 'pn_free_play_and_settlingin',
          status: 'COMPLETED',
          score: 7,
          maxScore: 7,
          percentage: 100,
          completedAt: new Date(),
        },
      });

      // Seed Badge and Sticker
      const badge = await prisma.badge.create({
        data: { name: 'Super Star', description: 'Earned 3 stars', iconKey: 'super-star.png' },
      });
      await prisma.childBadge.create({
        data: { childId: contextParentA.child.id, badgeId: badge.id },
      });

      const sticker = await prisma.sticker.create({
        data: { name: 'Happy Face', description: 'Settled in well', iconKey: 'happy-face.png', requiredStars: 3 },
      });
      await prisma.childSticker.create({
        data: { childId: contextParentA.child.id, stickerId: sticker.id },
      });
    });

    it('should return valid dashboard overview', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.progressOverview.completedLessons).toBe(1);
      expect(res.body.data.progressOverview.earnedXP).toBe(10);
      expect(res.body.data.progressOverview.earnedStars).toBe(3);
      expect(res.body.data.latestAssessment.percentage).toBe(100);
    });

    it('should return curriculum progress details', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}/progress`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.completedLessons).toBe(1);
      expect(res.body.data.totalLessons).toBeGreaterThan(1);
    });

    it('should return theme progress list', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}/themes`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].completedLessons).toBe(1);
    });

    it('should return subject progress list', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}/subjects`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].subject).toBe('English');
    });

    it('should return assessment summary details', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}/assessments`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.completedAssessments).toBe(1);
      expect(res.body.data.highestMasteryPercentage).toBe(100);
      expect(res.body.data.latestAssessment.assessmentId).toBe('pn_free_play_and_settlingin');
    });

    it('should return mastery summary insights', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}/mastery`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.overallMastery).toBeGreaterThanOrEqual(0);
      expect(res.body.data.subjectMastery.length).toBeGreaterThan(0);
      expect(res.body.data.lessonMastery.find((lm: any) => lm.lessonId === 'pn_free_play_and_settlingin').mastery).toBe(100);
    });

    it('should return achievements summary', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}/achievements`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.earnedXP).toBe(10);
      expect(res.body.data.earnedStars).toBe(3);
      expect(res.body.data.badges.length).toBe(1);
      expect(res.body.data.stickers.length).toBe(1);
      expect(res.body.data.badges[0].name).toBe('Super Star');
      expect(res.body.data.stickers[0].name).toBe('Happy Face');
    });

    it('should return learning history timeline', async () => {
      const res = await request
        .get(`/api/dashboard/${contextParentA.child.id}/history`)
        .set('Authorization', tokenParentA);

      expect(res.status).toBe(200);
      expect(res.body.data.history.length).toBeGreaterThan(0);
      const types = res.body.data.history.map((h: any) => h.type);
      expect(types).toContain('LESSON_COMPLETED');
      expect(types).toContain('ASSESSMENT_COMPLETED');
      expect(types).toContain('REWARD_EARNED');
    });
  });
});
