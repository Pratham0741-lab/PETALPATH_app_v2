import '../helpers/setup.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import {
  createTestUser,
  cleanDatabase,
  createTestUserData,
} from '../helpers/factories.js';
import {
  getExpiredToken,
  getMalformedToken,
  getTokenWithWrongSecret,
  createAuthenticatedContext,
  getAuthToken,
} from '../helpers/auth.js';

const request = supertest(app);

describe('Auth Integration', () => {
  describe('POST /api/auth/register', () => {
    it('should register with valid data and return 201', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      const res = await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'Password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.role).toBe('PARENT');
    });

    it('should return 409 for duplicate email', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'Password123',
      });

      const res = await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'Password123',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 when password is missing', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      const res = await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'Test User',
        email: 'not-an-email',
        password: 'Password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return 200', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const password = 'Password123';

      await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password,
      });

      const res = await request.post('/api/auth/login').send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
    });

    it('should return 401 with wrong password', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'Password123',
      });

      const res = await request.post('/api/auth/login').send({
        email,
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with non-existent email', async () => {
      const res = await request.post('/api/auth/login').send({
        email: `nonexistent-${Date.now()}@example.com`,
        password: 'Password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me (Auth Middleware)', () => {
    it('should return 401 without token', async () => {
      const res = await request.get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with malformed token', async () => {
      const res = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${getMalformedToken()}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with expired token', async () => {
      const res = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${getExpiredToken()}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 with valid token and user data', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user.id);

      const res = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe(user.id);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.user.name).toBe(user.name);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 200 with new tokens for valid refresh token', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      const registerRes = await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'Password123',
      });

      const originalRefreshToken = registerRes.body.data.refreshToken;

      const res = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(originalRefreshToken);

      // Old refresh token should be invalidated after rotation
      const staleRes = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken });

      expect(staleRes.status).toBe(401);
    });

    it('should return 401 with invalid refresh token', async () => {
      const res = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token-value' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 with expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: crypto.randomUUID() },
        process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key',
        { expiresIn: '0s' },
      );

      const res = await request
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid refresh token and return 200', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      const registerRes = await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'Password123',
      });

      const refreshToken = registerRes.body.data.refreshToken;

      const res = await request
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should be idempotent with already used token', async () => {
      const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

      const registerRes = await request.post('/api/auth/register').send({
        name: 'Test User',
        email,
        password: 'Password123',
      });

      const refreshToken = registerRes.body.data.refreshToken;

      await request.post('/api/auth/logout').send({ refreshToken });

      const res = await request
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 200 and resetToken for valid email', async () => {
      const user = await createTestUser();

      const res = await request
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetToken).toBeDefined();
      expect(typeof res.body.data.resetToken).toBe('string');
    });

    it('should return 404 for non-existent email', async () => {
      const res = await request
        .post('/api/auth/forgot-password')
        .send({ email: `nonexistent-${Date.now()}@example.com` });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token and return 200', async () => {
      const user = await createTestUser();

      const forgotRes = await request
        .post('/api/auth/forgot-password')
        .send({ email: user.email });

      const resetToken = forgotRes.body.data.resetToken;

      const res = await request
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: 'NewPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Password reset completed successfully');
    });

    it('should return 400 with invalid reset token', async () => {
      const res = await request
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-reset-token', newPassword: 'NewPassword123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/select-child', () => {
    it('should return 200 with new accessToken that includes childId', async () => {
      const { user, child, accessToken } = await createAuthenticatedContext();

      const res = await request
        .post('/api/auth/select-child')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ childId: child.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.childId).toBe(child.id);
    });
  });

  describe('Unauthorized access', () => {
    it('GET /health should return 200 without authentication', async () => {

      const res = await request.get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /api/adaptive/profile should return 401 without authentication', async () => {
      const res = await request.get('/api/adaptive/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authorization|unauthorized/i);
    });
  });
});
