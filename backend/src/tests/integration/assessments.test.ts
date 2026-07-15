import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { createTestUser, cleanDatabase } from '../helpers/factories.js';
import {
  createAuthenticatedContext,
  getAuthToken,
} from '../helpers/auth.js';
import { AssessmentQuestionType, Prisma } from '@prisma/client';

const request = supertest(app);

describe('Assessments Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createAdminToken = async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    return getAuthToken(admin.id, 'ADMIN');
  };

  const createAssessmentFixture = async () => {
    const assessment = await prisma.assessment.create({
      data: {
        title: 'Pre-K Readiness',
        ageGroup: '3-5',
        estimatedMinutes: 8,
      },
    });

    await prisma.assessmentQuestion.createMany({
      data: [
        {
          assessmentId: assessment.id,
          prompt: 'Can the child count to 10?',
          questionType: AssessmentQuestionType.MULTIPLE_CHOICE,
          options: [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ] as unknown as Prisma.InputJsonValue,
          order: 0,
          maxScore: 1,
          correctAnswer: 'yes',
        },
        {
          assessmentId: assessment.id,
          prompt: 'Rate attention span',
          questionType: AssessmentQuestionType.SCALE,
          order: 1,
          maxScore: 5,
        },
      ],
    });

    return prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      include: { questions: true },
    });
  };

  describe('GET /api/assessments', () => {
    it('should return 200 with active assessments', async () => {
      const { accessToken } = await createAuthenticatedContext();
      await createAssessmentFixture();
      const res = await request
        .get('/api/assessments')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Pre-K Readiness');
      expect(res.body.data[0].questions.length).toBe(2);
    });
  });

  describe('GET /api/assessments/:id', () => {
    it('should return 200 with assessment detail', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const assessment = await createAssessmentFixture();
      const res = await request
        .get(`/api/assessments/${assessment.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(assessment.id);
    });

    it('should return 404 for unknown assessment', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .get(`/api/assessments/${'00000000-0000-0000-0000-000000000000'}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/assessments (admin only)', () => {
    it('should return 403 for non-admin parents', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .post('/api/assessments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Should Fail',
          questions: [
            { prompt: 'Q?', questionType: 'TEXT' },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 201 and create assessment with questions for admin', async () => {
      const adminToken = await createAdminToken();
      const res = await request
        .post('/api/assessments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Assessment',
          ageGroup: '6-8',
          questions: [
            {
              prompt: 'Pick the largest number',
              questionType: 'MULTIPLE_CHOICE',
              options: [{ label: '9', value: '9' }],
              maxScore: 2,
              correctAnswer: '9',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Admin Assessment');
      expect(res.body.data.questions.length).toBe(1);
    });

    it('should return 400 for invalid payload', async () => {
      const adminToken = await createAdminToken();
      const res = await request
        .post('/api/assessments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Child-scoped attempts', () => {
    it('should return 401 without token when starting an attempt', async () => {
      const assessment = await createAssessmentFixture();
      const res = await request
        .post('/api/assessments/child-placeholder/attempts')
        .send({ assessmentId: assessment.id });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should start, submit, and score an attempt', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      const assessment = await createAssessmentFixture();
      const [mc, scale] = assessment.questions;

      const startRes = await request
        .post(`/api/assessments/${child.id}/attempts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ assessmentId: assessment.id });

      expect(startRes.status).toBe(201);
      expect(startRes.body.data.status).toBe('IN_PROGRESS');
      const attemptId = startRes.body.data.id;

      const submitRes = await request
        .post(`/api/assessments/${child.id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          responses: [
            { questionId: mc.id, answer: 'yes' },
            { questionId: scale.id, answer: '5' },
          ],
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.status).toBe('COMPLETED');
      expect(submitRes.body.data.score).toBe(6);
      expect(submitRes.body.data.maxScore).toBe(6);
      expect(submitRes.body.data.percentage).toBe(100);
      expect(Array.isArray(submitRes.body.data.rawResponses)).toBe(true);
    });

    it('should return 403 when submitting for another child', async () => {
      const ctxA = await createAuthenticatedContext();
      const ctxB = await createAuthenticatedContext();
      const assessment = await createAssessmentFixture();
      const [mc, scale] = assessment.questions;

      const startRes = await request
        .post(`/api/assessments/${ctxA.child.id}/attempts`)
        .set('Authorization', `Bearer ${ctxA.accessToken}`)
        .send({ assessmentId: assessment.id });
      const attemptId = startRes.body.data.id;

      const submitRes = await request
        .post(`/api/assessments/${ctxA.child.id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${ctxB.accessToken}`)
        .send({
          responses: [
            { questionId: mc.id, answer: 'yes' },
            { questionId: scale.id, answer: '5' },
          ],
        });

      expect(submitRes.status).toBe(403);
      expect(submitRes.body.success).toBe(false);
    });

    it('should return attempt history for a child', async () => {
      const { child, accessToken } = await createAuthenticatedContext();
      const assessment = await createAssessmentFixture();
      const [mc, scale] = assessment.questions;

      const startRes = await request
        .post(`/api/assessments/${child.id}/attempts`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ assessmentId: assessment.id });
      const attemptId = startRes.body.data.id;

      await request
        .post(`/api/assessments/${child.id}/attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          responses: [
            { questionId: mc.id, answer: 'no' },
            { questionId: scale.id, answer: '2' },
          ],
        });

      const historyRes = await request
        .get(`/api/assessments/${child.id}/attempts`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.success).toBe(true);
      expect(historyRes.body.data.length).toBe(1);
      expect(historyRes.body.data[0].status).toBe('COMPLETED');
      expect(historyRes.body.data[0].percentage).toBeLessThan(100);
    });
  });
});
