import { jest } from '@jest/globals';
import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import {
  createTestUser,
  createTestSubject,
  createTestSkill,
} from '../helpers/factories.js';
import {
  createAuthenticatedContext,
  getAuthToken,
  getMalformedToken,
} from '../helpers/auth.js';
import { masteryEngineService } from '../../modules/mastery/mastery.service.js';

const request = supertest(app);

describe('Error Handling Middleware', () => {
  describe('404 Not Found', () => {
    it('should return 404 for non-existent route', async () => {
      const res = await request.get('/api/non-existent-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot .* \/api\/non-existent-route/i);
    });

    it('should return 404 when requesting a non-existent child by id', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user.id);
      const fakeId = '00000000-0000-0000-0000-000000000001';

      const res = await request
        .get(`/api/children/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/child profile not found/i);
    });
  });

  describe('400 Validation Error', () => {
    it('should return 400 when registering with empty body', async () => {
      const res = await request.post('/api/auth/register').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when registering with email but no password', async () => {
      const res = await request.post('/api/auth/register').send({
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when creating child with empty body', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user.id);

      const res = await request
        .post('/api/children')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when updating mastery with negative accuracy', async () => {
      const { user, child, accessToken } = await createAuthenticatedContext();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);

      const res = await request
        .post('/api/mastery/update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skillId: skill.id,
          performance: {
            accuracy: -5,
            responseTime: 1.5,
            attempts: 1,
            retries: 0,
            engagementScore: 80,
            helpRequests: 0,
            sessionDuration: 300,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 400 when activating curriculum without skillId', async () => {
      const { accessToken } = await createAuthenticatedContext();

      const res = await request
        .post('/api/curriculum/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.skillId).toBeDefined();
    });
  });

  describe('401 Unauthorized', () => {
    it('should return 401 when accessing protected route without auth header', async () => {
      const res = await request.get('/api/children');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authorization/i);
    });

    it('should return 401 with malformed token', async () => {
      const res = await request
        .get('/api/children')
        .set('Authorization', `Bearer ${getMalformedToken()}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with empty Bearer token', async () => {
      const res = await request
        .get('/api/children')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when selecting child without auth', async () => {
      const res = await request
        .post('/api/auth/select-child')
        .send({ childId: '00000000-0000-0000-0000-000000000001' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('500 Internal Server Error', () => {
    it('should return 500 with generic message when an unexpected error occurs', async () => {
      const { user, child, accessToken } = await createAuthenticatedContext();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);

      jest.spyOn(masteryEngineService, 'processPerformance')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request
        .post('/api/mastery/update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skillId: skill.id,
          performance: {
            accuracy: 85,
            responseTime: 1.5,
            attempts: 3,
            retries: 1,
            engagementScore: 90,
            helpRequests: 0,
            sessionDuration: 300,
          },
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');

      (masteryEngineService.processPerformance as jest.Mock).mockRestore();
    });
  });

  describe('Missing child context', () => {
    it('should return 401 when accessing learning-events without childId in token', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user.id);

      const res = await request
        .get('/api/v1/learning-events')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/active child profile is not selected/i);
    });
  });

  describe('Repository failure simulation', () => {
    it('should gracefully handle repository layer errors', async () => {
      const { user, child, accessToken } = await createAuthenticatedContext();
      const subject = await createTestSubject();
      const skill = await createTestSkill(subject.id);

      jest.spyOn(masteryEngineService, 'processPerformance')
        .mockRejectedValueOnce(new Error('Repository query failed: relation "skill_health" does not exist'));

      const res = await request
        .post('/api/mastery/update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skillId: skill.id,
          performance: {
            accuracy: 90,
            responseTime: 2.0,
            attempts: 5,
            retries: 0,
            engagementScore: 85,
            helpRequests: 1,
            sessionDuration: 420,
          },
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Internal server error');
      expect(res.body.errors).toBeUndefined();

      (masteryEngineService.processPerformance as jest.Mock).mockRestore();
    });
  });
});
