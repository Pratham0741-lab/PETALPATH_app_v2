import { jest } from '@jest/globals';
import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { waitlistRepository } from '../../modules/waitlist/waitlist.repository.js';
import supertest from 'supertest';

const request = supertest(app);
const ENDPOINT = '/api/waitlist';

const post = (body: unknown) => request.post(ENDPOINT).send(body as object);

describe('POST /api/waitlist', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('response shape', () => {
    it('answers success with exactly { ok: true }, as JSON', async () => {
      const res = await post({ email: 'shape@example.com', source_page: '/' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^application\/json/);
      expect(res.body).toEqual({ ok: true });
    });

    it('answers invalid input with 400 { ok: false, error: "invalid_input" }', async () => {
      const res = await post({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/^application\/json/);
      expect(res.body).toEqual({ ok: false, error: 'invalid_input' });
    });

    it('answers a database failure with 500 { ok: false, error: "server_error" }', async () => {
      jest
        .spyOn(waitlistRepository, 'insertIfAbsent')
        .mockRejectedValueOnce(new Error('connection lost while inserting boom@example.com'));

      const res = await post({ email: 'boom@example.com' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ ok: false, error: 'server_error' });
    });

    it('answers malformed JSON with 400 invalid_input, not the app-wide 500', async () => {
      const res = await request
        .post(ENDPOINT)
        .set('Content-Type', 'application/json')
        .send('{"email": "broken@example.com"');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, error: 'invalid_input' });
    });

    it('rejects a non-JSON body with 400 invalid_input', async () => {
      const res = await request
        .post(ENDPOINT)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=form@example.com');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, error: 'invalid_input' });
      expect(await prisma.waitlist.count()).toBe(0);
    });

    it('is also served on /api/v1/waitlist and /waitlist with the same contract', async () => {
      for (const path of ['/api/v1/waitlist', '/waitlist']) {
        const res = await request.post(path).send({ email: `alias${path.length}@example.com` });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
      }
    });
  });

  describe('validation', () => {
    it.each<[string, unknown]>([
      ['missing email', { name: 'No Email' }],
      ['malformed email', { email: 'nope@' }],
      ['non-string email', { email: 12345 }],
      ['email over 254 characters', { email: `${'a'.repeat(250)}@example.com` }],
      ['name over 100 characters', { email: 'long-name@example.com', name: 'n'.repeat(101) }],
      ['non-string name', { email: 'num-name@example.com', name: 42 }],
      ['source_page over 64 characters', { email: 'long-src@example.com', source_page: `/${'p'.repeat(64)}` }],
      ['source_page with disallowed characters', { email: 'bad-src@example.com', source_page: '/<script>' }],
      ['an unknown field', { email: 'extra@example.com', ip: '203.0.113.7' }],
      ['an array body', [{ email: 'array@example.com' }]],
    ])('rejects %s and stores nothing', async (_label, body) => {
      const res = await post(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ ok: false, error: 'invalid_input' });
      expect(await prisma.waitlist.count()).toBe(0);
    });

    it('accepts the app form shape { name, email } without source_page', async () => {
      const res = await post({ name: 'App Parent', email: 'app@example.com' });

      expect(res.status).toBe(200);
      const row = await prisma.waitlist.findUnique({ where: { email: 'app@example.com' } });
      expect(row).toMatchObject({ name: 'App Parent', sourcePage: 'app' });
    });
  });

  describe('normalisation', () => {
    it('trims and lowercases the email, trims the name, keeps source_page', async () => {
      await post({ email: '  Mixed.Case@EXAMPLE.com ', name: '  Asha  ', source_page: '/faq' });

      const row = await prisma.waitlist.findFirst();
      expect(row).toMatchObject({ email: 'mixed.case@example.com', name: 'Asha', sourcePage: '/faq' });
    });

    it('stores a blank name as null', async () => {
      await post({ email: 'blank-name@example.com', name: '   ' });

      const row = await prisma.waitlist.findUnique({ where: { email: 'blank-name@example.com' } });
      expect(row?.name).toBeNull();
    });

    it('gives new rows a UUID id and stores no IP-derived or extra column', async () => {
      await request
        .post(ENDPOINT)
        .set('X-Forwarded-For', '203.0.113.7')
        .send({ email: 'columns@example.com', source_page: '/' });

      const row = await prisma.waitlist.findUnique({ where: { email: 'columns@example.com' } });
      expect(row?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(Object.keys(row ?? {}).sort()).toEqual(['createdAt', 'email', 'id', 'name', 'sourcePage']);
    });
  });

  describe('duplicates', () => {
    it('answers a repeat signup identically and keeps the original row unchanged', async () => {
      const first = await post({ email: 'dup@example.com', name: 'Original', source_page: '/' });
      const second = await post({ email: 'DUP@example.com', name: 'Different', source_page: '/faq' });

      // Same status, same body: the response never reveals that it existed.
      expect(second.status).toBe(first.status);
      expect(second.body).toEqual(first.body);
      expect(second.body).toEqual({ ok: true });

      const rows = await prisma.waitlist.findMany({ where: { email: 'dup@example.com' } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ name: 'Original', sourcePage: '/' });
    });

    it('survives concurrent signups for the same email with one row', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => post({ email: 'race@example.com' }))
      );

      results.forEach((res) => expect(res.body).toEqual({ ok: true }));
      expect(await prisma.waitlist.count({ where: { email: 'race@example.com' } })).toBe(1);
    });
  });

  describe('honeypot', () => {
    it('answers a filled honeypot with the normal success and stores nothing', async () => {
      const res = await post({ email: 'bot@example.com', website: 'http://spam.example' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(await prisma.waitlist.count()).toBe(0);
    });

    it('fakes success even when the rest of a bot submission is invalid', async () => {
      const res = await post({ email: 'garbage', website: 'x' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(await prisma.waitlist.count()).toBe(0);
    });

    it('treats an empty honeypot as a person', async () => {
      const res = await post({ email: 'human@example.com', website: '' });

      expect(res.body).toEqual({ ok: true });
      expect(await prisma.waitlist.count()).toBe(1);
    });
  });

  describe('logging', () => {
    it('logs outcome and request id only; never email, name or body', async () => {
      const info = jest.spyOn(logger, 'info');
      const error = jest.spyOn(logger, 'error');
      jest
        .spyOn(waitlistRepository, 'insertIfAbsent')
        .mockRejectedValueOnce(new Error('failed for secret-fail@example.com'));

      await post({ email: 'secret-ok@example.com', name: 'Secret Name' });
      await post({ email: 'secret-fail@example.com' });
      await post({ email: 'secret-bad' });

      const waitlistLines = [...info.mock.calls, ...error.mock.calls].filter(
        ([, msg]) => msg === 'waitlist'
      );
      expect(
        waitlistLines.map(([entry]) => (entry as { outcome: string }).outcome).sort()
      ).toEqual(['created', 'invalid_input', 'server_error']);
      for (const [entry] of waitlistLines) {
        expect(Object.keys(entry as object).sort()).toEqual(['outcome', 'requestId']);
      }
      const everything = JSON.stringify([...info.mock.calls, ...error.mock.calls]);
      expect(everything).not.toContain('secret-ok@example.com');
      expect(everything).not.toContain('secret-fail@example.com');
      expect(everything).not.toContain('Secret Name');
    });
  });
});
