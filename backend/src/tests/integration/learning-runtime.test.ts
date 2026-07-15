/**
 * Phase 3.5 — Learning Runtime & Session Engine integration tests.
 *
 * Exercises the full session lifecycle via the path-param endpoints
 * (POST /api/session/:id/{start|pause|resume|complete|abandon}) plus
 * auth/ownership/validation edge cases.
 */

import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import { createAuthenticatedContext } from '../helpers/auth.js';

const request = supertest(app);

async function createSessionAndReturnId(accessToken: string): Promise<string> {
  const res = await request
    .post('/api/session/')
    .set('Authorization', `Bearer ${accessToken}`);
  expect(res.status).toBe(201);
  expect(res.body.data.id).toBeDefined();
  return res.body.data.id;
}

describe('Phase 3.5 — Learning Runtime & Session Engine', () => {
  describe('Session lifecycle (path-param endpoints)', () => {
    it('1. creates a new session (POST /api/session/)', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request
        .post('/api/session/')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('GENERATED');
      expect(res.body.data.sessionBlocks.length).toBeGreaterThan(0);
    });

    it('2. starts a session (POST /api/session/:id/start)', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(accessToken);

      const res = await request
        .post(`/api/session/${sid}/start`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('STARTED');
      expect(res.body.data.startedAt).toBeDefined();
    });

    it('3. pauses an active session (POST /api/session/:id/pause)', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(accessToken);
      await request.post(`/api/session/${sid}/start`).set('Authorization', `Bearer ${accessToken}`);

      const res = await request
        .post(`/api/session/${sid}/pause`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PAUSED');
    });

    it('4. resumes a paused session (POST /api/session/:id/resume)', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(accessToken);
      await request.post(`/api/session/${sid}/start`).set('Authorization', `Bearer ${accessToken}`);
      await request.post(`/api/session/${sid}/pause`).set('Authorization', `Bearer ${accessToken}`);

      const res = await request
        .post(`/api/session/${sid}/resume`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('STARTED');
    });

    it('5. completes an active session (POST /api/session/:id/complete)', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(accessToken);
      await request.post(`/api/session/${sid}/start`).set('Authorization', `Bearer ${accessToken}`);

      const res = await request
        .post(`/api/session/${sid}/complete`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).toBeDefined();
    });

    it('6. abandons a session (POST /api/session/:id/abandon)', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(accessToken);

      const res = await request
        .post(`/api/session/${sid}/abandon`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ABANDONED');
    });

    it('7. rejects invalid transition (pause before start)', async () => {
      const { accessToken } = await createAuthenticatedContext();
      // Session is GENERATED — pausing is invalid (only STARTED can pause).
      const sid = await createSessionAndReturnId(accessToken);

      const res = await request
        .post(`/api/session/${sid}/pause`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('8. idempotent create — returns existing active session if one exists', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(accessToken);

      const res = await request
        .post('/api/session/')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200); // not 201 — already exists
      expect(res.body.data.id).toBe(sid);
    });
  });

  describe('Authentication & ownership', () => {
    it('9. returns 401 without auth token', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(accessToken);

      const res = await request.post(`/api/session/${sid}/start`);

      expect(res.status).toBe(401);
    });

    it('10. returns 403 for another user child session', async () => {
      const owner = await createAuthenticatedContext();
      const other = await createAuthenticatedContext();
      const sid = await createSessionAndReturnId(owner.accessToken);

      const res = await request
        .post(`/api/session/${sid}/start`)
        .set('Authorization', `Bearer ${other.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('11. returns 400 for malformed session id', async () => {
      const { accessToken } = await createAuthenticatedContext();

      const res = await request
        .post('/api/session/not-a-uuid/start')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });

    it('12. returns 404 for non-existent session', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const bogus = '11111111-1111-4111-8111-111111111111';

      const res = await request
        .post(`/api/session/${bogus}/start`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Session history', () => {
    it('13. returns session history for the child', async () => {
      const { accessToken } = await createAuthenticatedContext();
      // Create a session and complete it so history is non-empty.
      const sid = await createSessionAndReturnId(accessToken);
      await request.post(`/api/session/${sid}/start`).set('Authorization', `Bearer ${accessToken}`);
      await request.post(`/api/session/${sid}/complete`).set('Authorization', `Bearer ${accessToken}`);

      const res = await request
        .get('/api/session/history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
