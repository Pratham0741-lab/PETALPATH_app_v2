import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { cleanDatabase } from '../helpers/factories.js';

const request = supertest(app);

describe('Analytics Integration (Phase 3.3)', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const seedAnalyticsData = async (childId: string) => {
    // Build the lesson/video chain required for video-progress aggregation.
    const category = await prisma.category.create({
      data: { title: `Cat-${Date.now()}`, displayOrder: 0 },
    });
    const module = await prisma.module.create({
      data: { categoryId: category.id, title: 'Module A', displayOrder: 0 },
    });
    const lesson = await prisma.lesson.create({
      data: { moduleId: module.id, title: 'Lesson A', displayOrder: 0 },
    });
    const lesson2 = await prisma.lesson.create({
      data: { moduleId: module.id, title: 'Lesson B', displayOrder: 1 },
    });
    const activity = await prisma.activity.create({
      data: { lessonId: lesson.id, title: 'Activity A', activityType: 'VIDEO' },
    });
    const video = await prisma.video.create({
      data: { activityId: activity.id, title: 'Video A', videoKey: 'v.mp4', duration: 600 },
    });

    await prisma.videoProgress.create({
      data: { childId, videoId: video.id, isCompleted: true, watchPosition: 600, lastWatchedAt: new Date() },
    });
    await prisma.lessonProgress.create({
      data: {
        childId,
        lessonId: lesson.id,
        status: 'COMPLETED',
        totalStars: 3,
        completedAt: new Date(),
      },
    });
    // A started-but-not-completed lesson to test lessonsStarted vs completed.
    await prisma.lessonProgress.create({
      data: { childId, lessonId: lesson2.id, status: 'IN_PROGRESS' },
    });

    const assessment = await prisma.assessment.create({
      data: { title: 'Assessment A', estimatedMinutes: 5 },
    });
    await prisma.assessmentAttempt.create({
      data: {
        childId,
        assessmentId: assessment.id,
        status: 'COMPLETED',
        score: 4,
        maxScore: 5,
        percentage: 80,
        completedAt: new Date(),
      },
    });

    await prisma.reward.create({
      data: { childId, title: 'Star Reward', points: 10, earnedAt: new Date() },
    });
    await prisma.stars.create({ data: { childId, totalStars: 25 } });

    const badge = await prisma.badge.create({
      data: { name: 'Badge A', description: 'd', iconKey: 'b.png' },
    });
    await prisma.childBadge.create({ data: { childId, badgeId: badge.id } });

    const sticker = await prisma.sticker.create({
      data: { name: 'Sticker A', description: 'd', iconKey: 's.png', requiredStars: 5 },
    });
    await prisma.childSticker.create({ data: { childId, stickerId: sticker.id } });

    return { lesson, assessment, video };
  };

  describe('GET /api/analytics/overview', () => {
    it('should return 401 without token', async () => {
      const res = await request.get('/api/analytics/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when no active child is selected', async () => {
      const user = await prisma.user.create({
        data: {
          email: `nochild-${Date.now()}@example.com`,
          name: 'No Child',
          passwordHash: 'x',
          role: 'PARENT',
        },
      });
      const token = (await import('../helpers/auth.js')).getAuthToken(user.id, 'PARENT');
      const res = await request.get('/api/analytics/overview').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should aggregate overview metrics', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedAnalyticsData(child.id);

      const res = await request
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.lessonsCompleted).toBe(1);
      expect(d.lessonsStarted).toBeGreaterThanOrEqual(1);
      expect(d.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(d.assessmentsCompleted).toBe(1);
      expect(d.averageAssessmentScore).toBe(80);
      expect(d.totalStars).toBe(25);
      expect(d.totalBadges).toBe(1);
      expect(d.totalStickers).toBe(1);
      expect(d.totalLearningMinutes).toBe(10);
    });

    it('should return zeroes for a child with no activity', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.lessonsCompleted).toBe(0);
      expect(d.assessmentsCompleted).toBe(0);
      expect(d.totalStars).toBe(0);
      expect(d.totalLearningMinutes).toBe(0);
    });

    it('should return 404 for a non-existent childId query', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .get(`/api/analytics/overview?childId=${'00000000-0000-0000-0000-000000000000'}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for another user child', async () => {
      const { child } = await createAuthenticatedContext();
      const other = await createAuthenticatedContext();
      const res = await request
        .get(`/api/analytics/overview?childId=${child.id}`)
        .set('Authorization', `Bearer ${other.accessToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid childId query', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .get('/api/analytics/overview?childId=not-a-uuid')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/analytics/activity', () => {
    it('should return weekly buckets with seeded activity', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedAnalyticsData(child.id);

      const res = await request
        .get('/api/analytics/activity?period=weekly')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.period).toBe('weekly');
      expect(res.body.data.buckets.length).toBe(8);
      const total = res.body.data.buckets.reduce(
        (acc: number, b: { total: number }) => acc + b.total,
        0
      );
      expect(total).toBeGreaterThanOrEqual(3);
    });

    it('should return daily buckets', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedAnalyticsData(child.id);
      const res = await request
        .get('/api/analytics/activity?period=daily')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.buckets.length).toBe(7);
    });

    it('should return monthly buckets', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .get('/api/analytics/activity?period=monthly')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.buckets.length).toBe(12);
    });

    it('should return 400 for invalid period', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .get('/api/analytics/activity?period=yearly')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/analytics/progress', () => {
    it('should return progress trends', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedAnalyticsData(child.id);
      const res = await request
        .get('/api/analytics/progress')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.lessonTrend.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.assessments.completed).toBe(1);
      expect(res.body.data.assessments.averageScore).toBe(80);
      expect(res.body.data.modules).toHaveProperty('completed');
      expect(res.body.data.categories).toHaveProperty('total');
    });
  });

  describe('GET /api/analytics/rewards', () => {
    it('should return rewards summary', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedAnalyticsData(child.id);
      const res = await request
        .get('/api/analytics/rewards')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.stars).toBe(25);
      expect(res.body.data.badges.total).toBe(1);
      expect(res.body.data.stickers.total).toBe(1);
      expect(res.body.data.recentRewards.length).toBe(1);
      expect(res.body.data.recentRewards[0].title).toBe('Star Reward');
    });
  });

  describe('GET /api/analytics/timeline', () => {
    it('should return a paginated chronological timeline', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedAnalyticsData(child.id);
      const res = await request
        .get('/api/analytics/timeline?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);
      expect(res.body.pagination.page).toBe(1);
      const types = res.body.data.map((i: { type: string }) => i.type);
      expect(types).toContain('LESSON_COMPLETED');
      expect(types).toContain('ASSESSMENT_COMPLETED');
      expect(types).toContain('REWARD_EARNED');
      expect(types).toContain('VIDEO_WATCHED');
    });

    it('should respect pagination limit', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      await seedAnalyticsData(child.id);
      const res = await request
        .get('/api/analytics/timeline?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should return 401 without token', async () => {
      const res = await request.get('/api/analytics/timeline');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
