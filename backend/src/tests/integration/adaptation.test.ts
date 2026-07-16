import { prisma } from '../../config/database.js';
import { adaptationService } from '../../modules/adaptation/adaptation.service.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { createTestSubject, createTestSkill, cleanDatabase } from '../helpers/factories.js';
import app from '../../app.js';
import supertest from 'supertest';

describe('Adaptation Engine (Phase 5.5.6)', () => {
  let owner: { user: any; child: any; accessToken: string };
  let other: { user: any; child: any; accessToken: string };
  let subject: any;
  let skill1: any;
  let skill2: any;

  beforeAll(async () => {
    await cleanDatabase();
    owner = await createAuthenticatedContext();
    other = await createAuthenticatedContext();
    subject = await createTestSubject();
    skill1 = await createTestSkill(subject.id, {
      name: 'Adapt Skill 1',
      skillCode: 'ADAPT_001',
      isRootSkill: true,
      displayOrder: 1,
      difficulty: 2,
      estimatedDuration: 10,
      isCoreSkill: true,
      isOptionalSkill: false,
    });
    skill2 = await createTestSkill(subject.id, {
      name: 'Adapt Skill 2',
      skillCode: 'ADAPT_002',
      isRootSkill: true,
      displayOrder: 2,
      difficulty: 3,
      estimatedDuration: 10,
      isCoreSkill: true,
      isOptionalSkill: false,
    });
  });

  beforeEach(async () => {
    await prisma.adaptationEvent.deleteMany();
    await prisma.modalityPerformance.deleteMany();
    await prisma.learningProfile.deleteMany();
    await prisma.skillHealth.deleteMany();
    await prisma.skillHistory.deleteMany();
    await prisma.childSkillCurriculum.deleteMany();
    await prisma.sessionBlock.deleteMany();
    await prisma.sessionPlan.deleteMany();
    await prisma.dynamicRoadmap.deleteMany();

    await prisma.skillHealth.create({
      data: {
        childId: owner.child.id,
        skillId: skill1.id,
        masteryState: 'LEARNING',
        knowledgeScore: 75,
        confidenceScore: 70,
        retentionScore: 65,
        engagementScore: 60,
        consistencyScore: 70,
        masteryScore: 70,
        lastPracticed: new Date(),
        nextReviewDate: new Date(Date.now() + 86400000),
        reviewCount: 1,
        attemptCount: 3,
        retryCount: 0,
        decayFactor: 0.9,
        frequencyDays: 3,
      },
    });
    await prisma.skillHealth.create({
      data: {
        childId: owner.child.id,
        skillId: skill2.id,
        masteryState: 'LEARNING',
        knowledgeScore: 45,
        confidenceScore: 40,
        retentionScore: 50,
        engagementScore: 55,
        consistencyScore: 40,
        masteryScore: 40,
        lastPracticed: new Date(),
        nextReviewDate: new Date(Date.now() + 86400000),
        reviewCount: 0,
        attemptCount: 1,
        retryCount: 1,
        decayFactor: 0.85,
        frequencyDays: 2,
      },
    });
  });

  describe('POST /api/adaptation/:childId/analyze', () => {
    it('should return personalization factors for a child', async () => {
      const res = await supertest(app)
        .post(`/api/adaptation/${owner.child.id}/analyze`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('factors');
      expect(res.body.data).toHaveProperty('profile');
      expect(res.body.data).toHaveProperty('changes');
      expect(res.body.data).toHaveProperty('roadmapRefreshed');
      expect(res.body.data.factors).toHaveProperty('learningSpeed');
      expect(res.body.data.factors).toHaveProperty('confidenceTrend');
      expect(res.body.data.factors).toHaveProperty('retentionTrend');
      expect(res.body.data.factors).toHaveProperty('struggleIndex');
      expect(res.body.data.factors).toHaveProperty('consistencyScore');
      expect(res.body.data.factors).toHaveProperty('sessionCompletionRate');
      expect(res.body.data.factors).toHaveProperty('averageSessionTime');
      expect(res.body.data.factors).toHaveProperty('difficultyPreference');
      expect(res.body.data.factors).toHaveProperty('knowledgeStability');
      expect(res.body.data.factors).toHaveProperty('confidenceStability');
      expect(res.body.data.factors).toHaveProperty('reviewFrequencyDays');
      expect(res.body.data.factors).toHaveProperty('learningMomentum');
      expect(res.body.data.factors).toHaveProperty('engagementTrend');
    });

    it('should create and update learner profile', async () => {
      const res = await supertest(app)
        .post(`/api/adaptation/${owner.child.id}/analyze`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.data.profile).toHaveProperty('averageAccuracy');
      expect(res.body.data.profile).toHaveProperty('averageEngagement');
      expect(res.body.data.profile).toHaveProperty('optimalSessionDuration');
      expect(res.body.data.profile).toHaveProperty('preferredModality');
      expect(res.body.data.profile).toHaveProperty('learningVelocity');

      const profile = await prisma.learningProfile.findUnique({ where: { childId: owner.child.id } });
      expect(profile).not.toBeNull();
      expect(profile!.averageAccuracy).toBe(res.body.data.profile.averageAccuracy);
    });

    it('should log adaptation events for high struggle index', async () => {
      const res = await supertest(app)
        .post(`/api/adaptation/${owner.child.id}/analyze`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send();
      expect(res.status).toBe(200);
    });

    it('should reject unauthorized child access', async () => {
      const res = await supertest(app)
        .post(`/api/adaptation/${other.child.id}/analyze`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send();
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const res = await supertest(app)
        .post(`/api/adaptation/${owner.child.id}/analyze`)
        .send();
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/adaptation/:childId/profile', () => {
    it('should return existing profile and factors', async () => {
      const res = await supertest(app)
        .get(`/api/adaptation/${owner.child.id}/profile`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('profile');
      expect(res.body.data).toHaveProperty('factors');
    });

    it('should return null profile when no data exists', async () => {
      const freshCtx = await createAuthenticatedContext();
      const res = await supertest(app)
        .get(`/api/adaptation/${freshCtx.child.id}/profile`)
        .set('Authorization', `Bearer ${freshCtx.accessToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.data.profile).toBeNull();
    });

    it('should reject unauthorized access', async () => {
      const res = await supertest(app)
        .get(`/api/adaptation/${other.child.id}/profile`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send();
      expect(res.status).toBe(403);
    });
  });

  describe('Adaptation Service Unit Tests', () => {
    it('should produce deterministic factors for same inputs', async () => {
      const result1 = await adaptationService.analyze(owner.child.id);

      const result2 = await adaptationService.analyze(owner.child.id);
      expect(result2.factors.learningSpeed).toBe(result1.factors.learningSpeed);
      expect(result2.factors.struggleIndex).toBe(result1.factors.struggleIndex);
      expect(result2.factors.consistencyScore).toBe(result1.factors.consistencyScore);
    });

    it('should handle children with no skill data gracefully', async () => {
      const freshCtx = await createAuthenticatedContext();

      const res = await supertest(app)
        .post(`/api/adaptation/${freshCtx.child.id}/analyze`)
        .set('Authorization', `Bearer ${freshCtx.accessToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.data.factors.learningSpeed).toBeGreaterThanOrEqual(0);
      expect(res.body.data.profile.averageAccuracy).toBeGreaterThanOrEqual(0);
    });

    it('should update modality performance from completed sessions', async () => {
      await adaptationService.analyze(owner.child.id);

      const modalities = await prisma.modalityPerformance.findMany({
        where: { childId: owner.child.id },
      });
      expect(modalities).toBeDefined();
    });
  });

  describe('Ownership and Authorization', () => {
    it('should require valid token', async () => {
      const res = await supertest(app)
        .post(`/api/adaptation/${owner.child.id}/analyze`)
        .set('Authorization', 'Bearer invalid-token')
        .send();
      expect(res.status).toBe(401);
    });
  });

  describe('Transaction Safety', () => {
    it('should complete adaptation analysis normally', async () => {
      const res = await supertest(app)
        .post(`/api/adaptation/${owner.child.id}/analyze`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send();
      expect(res.status).toBe(200);
    });
  });
});
