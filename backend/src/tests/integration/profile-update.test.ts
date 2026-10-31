/** PUT /api/auth/update-profile — the parent's name, saved for real. */
import '../helpers/setup.js';
import app from '../../app.js';
import supertest from 'supertest';
import { prisma } from '../../config/database.js';
import { cleanDatabase } from '../helpers/factories.js';
import { createAuthenticatedContext } from '../helpers/auth.js';

const request = supertest(app);
const put = (token: string, body: unknown) =>
  request.put('/api/auth/update-profile').set('Authorization', `Bearer ${token}`).send(body as object);

describe('PUT /api/auth/update-profile', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('saves the name (trimmed) and returns the user', async () => {
    const { accessToken, user } = await createAuthenticatedContext();
    const res = await put(accessToken, { name: '  Asha Rao  ' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Asha Rao');
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.name).toBe('Asha Rao');

    const me = await request.get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.body.data.user.name).toBe('Asha Rao');
  });

  it.each([
    ['an empty name', { name: '   ' }],
    ['a missing name', {}],
    ['an unknown field', { name: 'Asha', role: 'ADMIN' }],
    ['an email change', { name: 'Asha', email: 'x@example.com' }],
  ])('rejects %s', async (_label, body) => {
    const { accessToken, user } = await createAuthenticatedContext({ userName: 'Before' });
    const res = await put(accessToken, body);
    expect(res.status).toBe(400);
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.name).toBe('Before');
    expect(row?.role).toBe('PARENT');
  });

  it('login, register and refresh return the name and email, including a just-saved name', async () => {
    const email = `name-${Date.now()}@example.com`;
    const reg = await request.post('/api/auth/register').send({ name: 'Asha', email, password: 'longpassword1' });
    expect(reg.body.data.user).toMatchObject({ name: 'Asha', email });

    await put(reg.body.data.accessToken, { name: 'Asha Rao' });

    const login = await request.post('/api/auth/login').send({ email, password: 'longpassword1' });
    expect(login.status).toBe(200);
    expect(login.body.data.user).toMatchObject({ name: 'Asha Rao', email });

    const refresh = await request.post('/api/auth/refresh').send({ refreshToken: login.body.data.refreshToken });
    expect(refresh.body.data.user).toMatchObject({ name: 'Asha Rao', email });
  });

  it('requires authentication', async () => {
    const res = await request.put('/api/auth/update-profile').send({ name: 'Asha' });
    expect(res.status).toBe(401);
  });
});
