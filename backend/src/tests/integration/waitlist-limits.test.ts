import supertest from 'supertest';

/**
 * Rate limiting, trust proxy and CORS for POST /api/waitlist.
 *
 * Limits are lowered and TRUST_PROXY set for this file only. config/env.ts
 * parses process.env once, on first import, so everything that imports it is
 * loaded dynamically AFTER these assignments (a static import would be hoisted
 * above them). Jest gives each test file its own module registry.
 *
 * TRUST_PROXY=1 lets each test act as a distinct client via X-Forwarded-For,
 * which is also the behaviour being tested: one trusted hop (nginx).
 */
const PER_MINUTE = 5;
const PER_HOUR = 12;
process.env.WAITLIST_RATE_LIMIT_PER_MINUTE = String(PER_MINUTE);
process.env.WAITLIST_RATE_LIMIT_PER_HOUR = String(PER_HOUR);
process.env.TRUST_PROXY = '1';
await import('../helpers/setup.js');
const { default: app } = await import('../../app.js');
const request = supertest(app);

const signup = (ip: string, n: number) =>
  request
    .post('/api/waitlist')
    .set('X-Forwarded-For', ip)
    .send({ email: `limit-${ip.replace(/\./g, '-')}-${n}@example.com`, source_page: '/' });

describe('waitlist rate limits', () => {
  it(`allows ${PER_MINUTE} per minute per client IP, then 429 rate_limited with Retry-After`, async () => {
    for (let i = 0; i < PER_MINUTE; i++) {
      expect((await signup('198.51.100.1', i)).status).toBe(200);
    }

    const blocked = await signup('198.51.100.1', 99);
    expect(blocked.status).toBe(429);
    expect(blocked.headers['content-type']).toMatch(/^application\/json/);
    expect(blocked.body).toEqual({ ok: false, error: 'rate_limited' });
    const retryAfter = Number(blocked.headers['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('keys the per-IP limit on the X-Forwarded-For client, so another client is unaffected', async () => {
    expect((await signup('198.51.100.2', 0)).status).toBe(200);
  });

  it(`caps the whole route at ${PER_HOUR} per hour across all clients`, async () => {
    // So far this file has used 6 of the hourly budget (5 + 1 above; the
    // per-IP-blocked request did not count, because the per-IP limiter runs
    // first). Use the rest from fresh IPs.
    let ip = 10;
    let accepted = 6;
    while (accepted < PER_HOUR) {
      const res = await signup(`192.0.2.${ip++}`, 0);
      expect(res.status).toBe(200);
      accepted++;
    }

    const blocked = await signup(`192.0.2.${ip++}`, 0);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ ok: false, error: 'rate_limited' });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(60);
  });
});

describe('waitlist CORS', () => {
  it.each(['https://petalpath.co.in', 'https://www.petalpath.co.in'])(
    'answers the preflight from %s with POST/OPTIONS only and no credentials',
    async (origin) => {
      const res = await request
        .options('/api/waitlist')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-methods']).toBe('POST,OPTIONS');
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    }
  );

  it('sends the allowed origin, and no credentials header, on the actual POST', async () => {
    const res = await request
      .post('/api/waitlist')
      .set('X-Forwarded-For', '203.0.113.50')
      .set('Origin', 'https://petalpath.co.in')
      .send({ email: 'cors-post@example.com', source_page: '/' });

    // May be 200 or 429 depending on the hourly budget used above; CORS
    // headers must be right either way.
    expect(res.headers['access-control-allow-origin']).toBe('https://petalpath.co.in');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('does not allow an unlisted origin', async () => {
    const res = await request
      .options('/api/waitlist')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not grant the site origins any other endpoint', async () => {
    const res = await request
      .options('/api/children')
      .set('Origin', 'https://petalpath.co.in')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
