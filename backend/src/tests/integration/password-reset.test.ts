import supertest from 'supertest';
import { jest } from '@jest/globals';
import crypto from 'crypto';

/**
 * Password reset: POST /api/auth/forgot-password and /api/auth/reset-password.
 *
 * Mail is mocked: the mock captures the message, which is the only place the
 * plain reset code exists. Limits are set for this file only, before anything
 * imports config/env.ts (it parses process.env once). TRUST_PROXY=1 lets each
 * test act as its own client IP via X-Forwarded-For, so the per-IP limit is
 * only reached where a test means to reach it.
 */
const PER_IP = 6;
const PER_EMAIL = 3;
process.env.PASSWORD_RESET_PER_IP_MAX = String(PER_IP);
process.env.PASSWORD_RESET_PER_EMAIL_MAX = String(PER_EMAIL);
process.env.PASSWORD_RESET_ATTEMPTS_PER_IP_MAX = '1000';
process.env.TRUST_PROXY = '1';
await import('../helpers/setup.js');
const { default: app } = await import('../../app.js');
const { prisma } = await import('../../config/database.js');
const { logger } = await import('../../utils/logger.js');
const { createTestUser } = await import('../helpers/factories.js');
const { FORGOT_PASSWORD_MESSAGE } = await import('../../modules/users/auth.controller.js');
const { RESET_TOKEN_TTL_MS, hashResetToken } = await import('../../modules/users/auth.service.js');
const { createEmailService, setEmailServiceForTests } = await import('../../shared/services/email.service.js');
type EmailMessage = import('../../shared/services/email.service.js').EmailMessage;

const request = supertest(app);

const sent: EmailMessage[] = [];
beforeAll(() => {
  setEmailServiceForTests({ enabled: true, send: async (m) => void sent.push(m) });
});
afterAll(() => setEmailServiceForTests(null));
beforeEach(() => {
  sent.length = 0;
});

let ipCounter = 1;
/** A fresh client IP per call site, so the per-IP limit does not interfere. */
const nextIp = () => `198.51.100.${ipCounter++}`;

const forgot = (email: string, ip = nextIp()) =>
  request.post('/api/auth/forgot-password').set('X-Forwarded-For', ip).send({ email });
const reset = (token: string, newPassword: string) =>
  request.post('/api/auth/reset-password').set('X-Forwarded-For', nextIp()).send({ token, newPassword });

/** The reset code from the last mocked email. */
const codeFrom = (m: EmailMessage) => {
  const match = m.text.match(/^[A-Za-z0-9_-]{43}$/m);
  if (!match) throw new Error('no code in email');
  return match[0];
};

const uniqueEmail = () => `reset-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.com`;

async function registerParent(password = 'OldPassword123') {
  const email = uniqueEmail();
  const res = await request.post('/api/auth/register').send({ name: 'Parent', email, password });
  expect(res.status).toBe(201);
  return { email, password, accessToken: res.body.data.accessToken, refreshToken: res.body.data.refreshToken };
}

const GENERIC = { success: true, data: { message: FORGOT_PASSWORD_MESSAGE } };

describe('POST /api/auth/forgot-password', () => {
  it('answers a real account with the generic message and no token; only the hash is stored', async () => {
    const { email } = await registerParent();
    const before = Date.now();
    const res = await forgot(email);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(GENERIC);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(email);
    const code = codeFrom(sent[0]);
    expect(JSON.stringify(res.body)).not.toContain(code);
    expect(JSON.stringify(res.headers)).not.toContain(code);

    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.resetPasswordToken).toBe(hashResetToken(code));
    expect(row?.resetPasswordToken).not.toBe(code);
    const ttl = row!.resetPasswordExpires!.getTime() - before;
    expect(ttl).toBeGreaterThan(RESET_TOKEN_TTL_MS - 60_000);
    expect(ttl).toBeLessThanOrEqual(RESET_TOKEN_TTL_MS + 60_000);
  });

  it('gives the identical response for an unknown email and a Google-only account, and sends nothing', async () => {
    const { email } = await registerParent();
    const real = await forgot(email);
    sent.length = 0;

    const unknown = await forgot(uniqueEmail());
    const google = await createTestUser({ provider: 'google', email: uniqueEmail() });
    await prisma.user.update({ where: { id: google.id }, data: { passwordHash: null } });
    const googleRes = await forgot(google.email);

    for (const res of [unknown, googleRes]) {
      expect(res.status).toBe(real.status);
      expect(res.body).toEqual(real.body);
      expect(res.headers['content-type']).toBe(real.headers['content-type']);
    }
    expect(sent).toHaveLength(0);
    const g = await prisma.user.findUnique({ where: { id: google.id } });
    expect(g?.resetPasswordToken).toBeNull();
  });

  it('never logs the reset code', async () => {
    const calls: unknown[][] = [];
    const spies = (['info', 'warn', 'error', 'debug'] as const).map((level) =>
      jest.spyOn(logger, level).mockImplementation(((...args: unknown[]) => void calls.push(args)) as never),
    );
    try {
      const { email, password } = await registerParent();
      await forgot(email);
      const code = codeFrom(sent[0]);
      await reset(code, `${password}-new`);
      expect(calls.length).toBeGreaterThan(0);
      expect(JSON.stringify(calls)).not.toContain(code);
      expect(JSON.stringify(calls)).not.toContain(email);
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  });

  it(`limits each email to ${PER_EMAIL} requests, from any IP, known or not`, async () => {
    for (const email of [(await registerParent()).email, uniqueEmail()]) {
      for (let i = 0; i < PER_EMAIL; i++) expect((await forgot(email)).status).toBe(200);
      const blocked = await forgot(email.toUpperCase());
      expect(blocked.status).toBe(429);
      expect(blocked.body.success).toBe(false);
    }
  });

  it(`limits each client IP to ${PER_IP} requests`, async () => {
    const ip = '203.0.113.7';
    for (let i = 0; i < PER_IP; i++) expect((await forgot(uniqueEmail(), ip)).status).toBe(200);
    expect((await forgot(uniqueEmail(), ip)).status).toBe(429);
    expect((await forgot(uniqueEmail())).status).toBe(200); // another client is unaffected
  });
});

describe('POST /api/auth/reset-password', () => {
  it('sets the new password; the code works only once', async () => {
    const { email, password } = await registerParent();
    await forgot(email);
    const code = codeFrom(sent[0]);

    const ok = await reset(code, 'BrandNewPass1');
    expect(ok.status).toBe(200);
    expect(JSON.stringify(ok.body)).not.toContain(code);

    expect((await request.post('/api/auth/login').send({ email, password: 'BrandNewPass1' })).status).toBe(200);
    expect((await request.post('/api/auth/login').send({ email, password })).status).toBe(401);

    const again = await reset(code, 'AnotherPass2');
    expect(again.status).toBe(400);
    expect((await request.post('/api/auth/login').send({ email, password: 'BrandNewPass1' })).status).toBe(200);
  });

  it('a newer request invalidates the older code', async () => {
    const { email } = await registerParent();
    await forgot(email);
    const first = codeFrom(sent[0]);
    await forgot(email);
    const second = codeFrom(sent[1]);
    expect(second).not.toBe(first);

    expect((await reset(first, 'BrandNewPass1')).status).toBe(400);
    expect((await reset(second, 'BrandNewPass1')).status).toBe(200);
  });

  it('rejects an expired code', async () => {
    const { email } = await registerParent();
    await forgot(email);
    const code = codeFrom(sent[0]);
    await prisma.user.update({ where: { email }, data: { resetPasswordExpires: new Date(Date.now() - 1000) } });

    expect((await reset(code, 'BrandNewPass1')).status).toBe(400);
  });

  it('rejects a made-up code and the stored hash itself', async () => {
    const { email } = await registerParent();
    await forgot(email);
    const row = await prisma.user.findUnique({ where: { email } });
    expect((await reset(crypto.randomBytes(32).toString('base64url'), 'BrandNewPass1')).status).toBe(400);
    expect((await reset(row!.resetPasswordToken!, 'BrandNewPass1')).status).toBe(400);
  });

  it('revokes every session: refresh tokens and access tokens issued before the reset', async () => {
    const { email, accessToken, refreshToken } = await registerParent();
    const other = await request.post('/api/auth/login').send({ email, password: 'OldPassword123' });
    expect(other.status).toBe(200);

    const me = () => request.get('/api/auth/me');
    expect((await me().set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);

    await forgot(email);
    expect((await reset(codeFrom(sent[0]), 'BrandNewPass1')).status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(await prisma.refreshToken.count({ where: { userId: user!.id } })).toBe(0);
    for (const token of [accessToken, other.body.data.accessToken]) {
      expect((await me().set('Authorization', `Bearer ${token}`)).status).toBe(401);
    }
    for (const token of [refreshToken, other.body.data.refreshToken]) {
      expect((await request.post('/api/auth/refresh').send({ refreshToken: token })).status).toBe(401);
    }

    // A login after the reset works. iat is in whole seconds and a token from
    // the reset's own second is refused, so log in from the next second.
    await new Promise((r) => setTimeout(r, 1100));
    const fresh = await request.post('/api/auth/login').send({ email, password: 'BrandNewPass1' });
    expect(fresh.status).toBe(200);
    expect((await me().set('Authorization', `Bearer ${fresh.body.data.accessToken}`)).status).toBe(200);
  });
});

describe('email service selection', () => {
  it('is disabled unless both a sender and a region are configured', () => {
    expect(createEmailService({}).enabled).toBe(false);
    expect(createEmailService({ from: 'no-reply@example.com' }).enabled).toBe(false);
    expect(createEmailService({ region: 'ap-south-1' }).enabled).toBe(false);
    expect(createEmailService({ from: ' ', region: 'ap-south-1' }).enabled).toBe(false);
    expect(createEmailService({ from: 'no-reply@example.com', region: 'ap-south-1' }).enabled).toBe(true);
  });

  it('with mail disabled, a reset request sends nothing and still answers generically', async () => {
    setEmailServiceForTests(createEmailService({}));
    try {
      const { email } = await registerParent();
      const res = await forgot(email);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(GENERIC);
    } finally {
      setEmailServiceForTests({ enabled: true, send: async (m) => void sent.push(m) });
    }
  });
});
