import supertest from 'supertest';

/**
 * GET /api/config/public: unauthenticated, booleans only.
 * Touches no database tables (no cleanDatabase helper).
 */
const { default: app } = await import('../../app.js');
const { prisma } = await import('../../config/database.js');
const { setEmailServiceForTests, createEmailService } = await import('../../shared/services/email.service.js');

const request = supertest(app);

afterEach(() => setEmailServiceForTests(null));
afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/config/public', () => {
  it('reports passwordResetEmail false when mail is not configured, and nothing else', async () => {
    setEmailServiceForTests(createEmailService({}));
    const res = await request.get('/api/config/public');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { passwordResetEmail: false } });
  });

  it('reports passwordResetEmail true only when SES_FROM and a region are set', async () => {
    setEmailServiceForTests(createEmailService({ from: 'no-reply@example.com', region: 'ap-south-1' }));
    const res = await request.get('/api/config/public');
    expect(res.body).toEqual({ success: true, data: { passwordResetEmail: true } });

    setEmailServiceForTests(createEmailService({ from: 'no-reply@example.com' }));
    expect((await request.get('/api/config/public')).body.data.passwordResetEmail).toBe(false);
    setEmailServiceForTests(createEmailService({ region: 'ap-south-1' }));
    expect((await request.get('/api/config/public')).body.data.passwordResetEmail).toBe(false);
  });

  it('needs no auth token', async () => {
    const res = await request.get('/api/config/public');
    expect(res.status).toBe(200);
  });
});
