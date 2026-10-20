import supertest from 'supertest';
import { createAuthenticatedContext } from '../helpers/auth.js';

/**
 * With ENABLE_DEV_TOOLS off (the production default) the force-complete and
 * unlock endpoints are not registered at all. env.ts is parsed on first import,
 * so the app is imported dynamically after the flag is set.
 */
process.env.ENABLE_DEV_TOOLS = 'false';
await import('../helpers/setup.js');
const { default: app } = await import('../../app.js');
const request = supertest(app);

// A real signed-in parent, so a 404 means "no such route", not a failed auth.
let token = '';
let childId = '';
beforeEach(async () => {
  const ctx = await createAuthenticatedContext();
  token = ctx.accessToken;
  childId = ctx.child.id;
});

const DEV_ROUTES = [
  () => '/api/progress/module/complete',
  () => '/api/progress/category/complete',
  () => '/api/curriculum/complete',
  () => `/api/skill-roadmap/children/${childId}/unlock/some-skill`,
];

describe('dev tools off', () => {
  it.each(DEV_ROUTES.map((r, i) => [i, r] as const))('dev route #%i is not registered (404)', async (_i, route) => {
    const res = await request.post(route()).set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(404);
  });

  it('keeps the real completion endpoint (it validates instead of 404)', async () => {
    const res = await request.post('/api/progress/complete').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });
});
