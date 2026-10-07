import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { randomUUID } from 'crypto';
import {
  cleanDatabase,
  createTestCategory,
  createTestModule,
  createTestLesson,
  createTestChild,
  createTestUser,
} from '../helpers/factories.js';
import { createAuthenticatedContext, getAuthToken } from '../helpers/auth.js';

const request = supertest(app);

/** RATE_LIMIT_FEEDBACK_MAX, set in env-setup.cjs. */
const LIMIT = 5;

async function setup() {
  const ctx = await createAuthenticatedContext();
  const category = await createTestCategory();
  const module = await createTestModule(category.id);
  const lesson = await createTestLesson(module.id);
  return { ...ctx, lesson };
}

const post = (token: string, body: unknown) =>
  request.post('/api/feedback').set('Authorization', `Bearer ${token}`).send(body as object);

describe('Lesson feedback', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/feedback — validation', () => {
    it('saves a rating and returns 201', async () => {
      const { accessToken, child, user, lesson } = await setup();

      const res = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 4, appVersion: '1.0.0' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ lessonId: lesson.id, rating: 4, reasons: [], comment: null });

      const row = await prisma.feedback.findUniqueOrThrow({ where: { id: res.body.data.id } });
      expect(row).toMatchObject({ parentId: user.id, childId: child.id, appVersion: '1.0.0' });
    });

    it.each([
      ['zero', 0],
      ['six', 6],
      ['a fraction', 3.5],
      ['a numeric string', '4'],
      ['null', null],
    ])('rejects a rating of %s with 400', async (_label, rating) => {
      const { accessToken, child, lesson } = await setup();
      const res = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await prisma.feedback.count()).toBe(0);
    });

    it('rejects a missing rating', async () => {
      const { accessToken, child, lesson } = await setup();
      const res = await post(accessToken, { lessonId: lesson.id, childId: child.id });
      expect(res.status).toBe(400);
    });

    it('trims the comment, and stores whitespace-only as no comment', async () => {
      const { accessToken, child, lesson } = await setup();

      const a = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 5, comment: '  great pacing  ' });
      expect(a.status).toBe(201);
      expect(a.body.data.comment).toBe('great pacing');

      const b = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 5, comment: ' \n\t ' });
      expect(b.status).toBe(201);
      expect(b.body.data.comment).toBeNull();
    });

    it('accepts exactly 1000 characters and rejects 1001', async () => {
      const { accessToken, child, lesson } = await setup();
      const ok = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 3, comment: 'x'.repeat(1000) });
      expect(ok.status).toBe(201);
      const tooLong = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 3, comment: 'x'.repeat(1001) });
      expect(tooLong.status).toBe(400);
    });

    it('measures the comment after trimming', async () => {
      const { accessToken, child, lesson } = await setup();
      const res = await post(accessToken, {
        lessonId: lesson.id,
        childId: child.id,
        rating: 3,
        comment: `   ${'x'.repeat(1000)}   `,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.comment).toHaveLength(1000);
    });

    it('rejects unknown reasons and de-duplicates known ones', async () => {
      const { accessToken, child, lesson } = await setup();
      const bad = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 2, reasons: ['BORING'] });
      expect(bad.status).toBe(400);

      const ok = await post(accessToken, {
        lessonId: lesson.id,
        childId: child.id,
        rating: 2,
        reasons: ['TOO_HARD', 'TOO_LONG', 'TOO_HARD'],
      });
      expect(ok.status).toBe(201);
      expect(ok.body.data.reasons).toEqual(['TOO_HARD', 'TOO_LONG']);
    });

    it('returns 404 for an unknown lesson', async () => {
      const { accessToken, child } = await setup();
      const res = await post(accessToken, { lessonId: 'no_such_lesson', childId: child.id, rating: 3 });
      expect(res.status).toBe(404);
    });

    it("forbids rating for another parent's child", async () => {
      const { lesson } = await setup();
      const other = await createTestUser();
      const otherChild = await createTestChild(other.id);
      const intruder = await createTestUser();
      const token = getAuthToken(intruder.id);

      const res = await post(token, { lessonId: lesson.id, childId: otherChild.id, rating: 3 });
      expect(res.status).toBe(403);
    });

    it('requires authentication', async () => {
      const res = await request.post('/api/feedback').send({ rating: 3 });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/feedback — follow-up and replay', () => {
    it('adds reasons and comment to the same row and keeps the rating', async () => {
      const { accessToken, child, lesson } = await setup();
      const id = randomUUID();

      const first = await post(accessToken, { id, lessonId: lesson.id, childId: child.id, rating: 4 });
      expect(first.status).toBe(201);

      const second = await post(accessToken, {
        id,
        lessonId: lesson.id,
        childId: child.id,
        rating: 4,
        reasons: ['LOVED_IT'],
        comment: 'more songs please',
      });
      expect(second.status).toBe(200);
      expect(second.body.data).toMatchObject({ id, rating: 4, reasons: ['LOVED_IT'], comment: 'more songs please' });
      expect(await prisma.feedback.count()).toBe(1);
    });

    it('does not wipe reasons/comment when a rating-only request is replayed afterwards', async () => {
      const { accessToken, child, lesson } = await setup();
      const id = randomUUID();
      const rating = { id, lessonId: lesson.id, childId: child.id, rating: 2 };

      await post(accessToken, rating);
      await post(accessToken, { ...rating, reasons: ['TOO_LONG'], comment: 'long' });
      const replay = await post(accessToken, rating);

      expect(replay.status).toBe(200);
      expect(replay.body.data).toMatchObject({ reasons: ['TOO_LONG'], comment: 'long' });
    });

    it("will not let another parent overwrite a row by reusing its id", async () => {
      const { accessToken, child, lesson } = await setup();
      const id = randomUUID();
      await post(accessToken, { id, lessonId: lesson.id, childId: child.id, rating: 5 });

      const other = await createAuthenticatedContext();
      const res = await post(other.accessToken, { id, lessonId: lesson.id, childId: other.child.id, rating: 1 });

      expect(res.status).toBe(404);
      expect((await prisma.feedback.findUniqueOrThrow({ where: { id } })).rating).toBe(5);
    });
  });

  describe('POST /api/feedback — rate limiting', () => {
    it(`allows ${LIMIT} submissions per parent, then returns 429`, async () => {
      const { accessToken, child, lesson } = await setup();
      const body = { lessonId: lesson.id, childId: child.id, rating: 3 };

      for (let i = 0; i < LIMIT; i++) {
        const res = await post(accessToken, body);
        expect(res.status).toBe(201);
      }

      const limited = await post(accessToken, body);
      expect(limited.status).toBe(429);
      expect(limited.body).toEqual({
        success: false,
        message: 'Too much feedback at once, please try again later.',
      });
      expect(limited.headers['ratelimit-policy']).toBeDefined();
      expect(await prisma.feedback.count()).toBe(LIMIT);
    });

    it('counts invalid submissions towards the limit', async () => {
      const { accessToken, child, lesson } = await setup();
      for (let i = 0; i < LIMIT; i++) {
        const res = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 9 });
        expect(res.status).toBe(400);
      }
      const res = await post(accessToken, { lessonId: lesson.id, childId: child.id, rating: 3 });
      expect(res.status).toBe(429);
    });

    it('limits each parent separately, not by shared IP', async () => {
      const a = await setup();
      for (let i = 0; i < LIMIT; i++) {
        await post(a.accessToken, { lessonId: a.lesson.id, childId: a.child.id, rating: 3 });
      }
      expect((await post(a.accessToken, { lessonId: a.lesson.id, childId: a.child.id, rating: 3 })).status).toBe(429);

      // Same IP (supertest), different parent: unaffected.
      const b = await createAuthenticatedContext();
      const res = await post(b.accessToken, { lessonId: a.lesson.id, childId: b.child.id, rating: 3 });
      expect(res.status).toBe(201);
    });
  });
});
