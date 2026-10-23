/**
 * Baseline questionnaire: POST/GET /api/children/:childId/baseline, parental
 * consent, and placement (getStartingLesson + the roadmap's current lesson).
 */
import '../helpers/setup.js';
import app from '../../app.js';
import { prisma } from '../../config/database.js';
import supertest from 'supertest';
import { cleanDatabase } from '../helpers/factories.js';
import { createAuthenticatedContext } from '../helpers/auth.js';
import { curriculumService } from '../../modules/curriculum/index.js';
import { buildPlacement, domainOfNode, loadDomainMap, startingLessonFor } from '../../modules/baseline/placement.js';
import { getStartingLesson } from '../../modules/baseline/baseline.service.js';
import { BASELINE_DOMAINS } from '../../modules/baseline/baseline.types.js';

const request = supertest(app);

// createAuthenticatedContext's child is age 5 / ageGroup "3-5" → nursery.
const GRADE = 'nursery';

const body = (over: Record<string, unknown> = {}) => ({
  assessed_at: '2026-10-23T10:00:00.000Z',
  grade: GRADE,
  domains: { english: { level: 3, confidence: 'high' }, maths: { level: 0, confidence: 'high' } },
  strengths: ['english'],
  focus_areas: ['maths'],
  skipped: false,
  ...over,
});

const post = (token: string, childId: string, b: unknown) =>
  request.post(`/api/children/${childId}/baseline`).set('Authorization', `Bearer ${token}`).send(b as object);

describe('Baseline', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/children/:childId/baseline', () => {
    it('stores one baseline per child: 201 then 200 replaces it', async () => {
      const { accessToken, child } = await createAuthenticatedContext();
      const first = await post(accessToken, child.id, body());
      expect(first.status).toBe(201);
      expect(first.body.data).toMatchObject({ child_id: child.id, grade: GRADE, skipped: false });

      const second = await post(accessToken, child.id, body({ strengths: [], focus_areas: [] }));
      expect(second.status).toBe(200);
      expect(await prisma.childBaseline.count({ where: { childId: child.id } })).toBe(1);

      const got = await request.get(`/api/children/${child.id}/baseline`).set('Authorization', `Bearer ${accessToken}`);
      expect(got.body.data.strengths).toEqual([]);
    });

    it('accepts a skipped baseline with no domains', async () => {
      const { accessToken, child } = await createAuthenticatedContext();
      const res = await post(accessToken, child.id, body({ domains: {}, strengths: [], focus_areas: [], skipped: true }));
      expect(res.status).toBe(201);
    });

    it.each([
      ['an unknown top-level field', { name: 'Asha' }],
      ['a birth date', { birth_date: '2021-01-01' }],
      ['an unknown domain', { domains: { music: { level: 1, confidence: 'low' } }, strengths: [], focus_areas: [] }],
      ['an unknown field inside a domain', { domains: { english: { level: 1, confidence: 'low', score: 9 } }, strengths: [], focus_areas: [] }],
      ['a level out of range', { domains: { english: { level: 4, confidence: 'high' } }, strengths: [], focus_areas: [] }],
      ['an unknown grade', { grade: 'grade1' }],
      ['a strength with no result', { strengths: ['hindi'] }],
      ['a skipped baseline with results', { skipped: true }],
      ['a bad timestamp', { assessed_at: 'yesterday' }],
    ])('rejects %s (400) and stores nothing', async (_label, over) => {
      const { accessToken, child } = await createAuthenticatedContext();
      const res = await post(accessToken, child.id, body(over));
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(await prisma.childBaseline.count()).toBe(0);
    });

    it("rejects a child_id that is not the URL's", async () => {
      const { accessToken, child } = await createAuthenticatedContext();
      const other = await createAuthenticatedContext();
      const res = await post(accessToken, child.id, body({ child_id: other.child.id }));
      expect(res.status).toBe(400);
    });

    it("cannot write another parent's child", async () => {
      const mine = await createAuthenticatedContext();
      const theirs = await createAuthenticatedContext();
      const res = await post(mine.accessToken, theirs.child.id, body());
      expect([403, 404]).toContain(res.status);
      expect(await prisma.childBaseline.count()).toBe(0);
    });

    it('requires authentication', async () => {
      const { child } = await createAuthenticatedContext();
      const res = await request.post(`/api/children/${child.id}/baseline`).send(body());
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/consent', () => {
    it('records the consent version and time on the parent', async () => {
      const { accessToken, user } = await createAuthenticatedContext();
      const res = await request.post('/api/auth/consent').set('Authorization', `Bearer ${accessToken}`).send({ version: '2026-10-v1' });
      expect(res.status).toBe(200);
      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.parentalConsentVersion).toBe('2026-10-v1');
      expect(row?.parentalConsentAt).toBeInstanceOf(Date);
    });

    it('rejects unknown fields', async () => {
      const { accessToken } = await createAuthenticatedContext();
      const res = await request.post('/api/auth/consent').set('Authorization', `Bearer ${accessToken}`).send({ version: 'v1', child_name: 'x' });
      expect(res.status).toBe(400);
    });
  });

  describe('placement', () => {
    const lessons = curriculumService.getLessonsInCurriculumOrder(GRADE);
    const map = loadDomainMap();
    const inDomain = (d: string) => lessons.filter((n) => domainOfNode(n, map) === d);

    it('maps every domain to some nursery lessons', () => {
      for (const d of BASELINE_DOMAINS) expect(inDomain(d).length).toBeGreaterThan(0);
    });

    it('starts Not yet / Emerging at the first lesson and Secure further in', () => {
      const english = inDomain('english');
      expect(startingLessonFor(english, { level: 0, confidence: 'high' }, map)?.id).toBe(english[0].id);
      expect(startingLessonFor(english, { level: 1, confidence: 'high' }, map)?.id).toBe(english[0].id);
      const secure = startingLessonFor(english, { level: 3, confidence: 'high' }, map)!;
      expect(english.indexOf(secure)).toBeGreaterThan(0);
      expect(secure.difficulty).toBeGreaterThan(english[0].difficulty);
    });

    it('starts a low-confidence result one step lower', () => {
      const english = inDomain('english');
      const high = startingLessonFor(english, { level: 3, confidence: 'high' }, map)!;
      const low = startingLessonFor(english, { level: 3, confidence: 'low' }, map)!;
      expect(english.indexOf(low)).toBeLessThanOrEqual(english.indexOf(high));
    });

    it('a skipped baseline places nothing', () => {
      const p = buildPlacement(lessons, { domains: {}, skipped: true }, map);
      expect(p.unlocked.size).toBe(0);
    });

    it('getStartingLesson and the roadmap follow the baseline', async () => {
      const { accessToken, child } = await createAuthenticatedContext();
      expect(await getStartingLesson(child.id, 'english')).toBeNull(); // no baseline yet → default

      await post(accessToken, child.id, body({ domains: { english: { level: 3, confidence: 'high' } }, strengths: ['english'], focus_areas: [] }));
      const start = await getStartingLesson(child.id, 'english');
      expect(start).not.toBeNull();
      expect(start!.id).not.toBe(inDomain('english')[0].id);

      const roadmap = await request.get('/api/roadmap').set('Authorization', `Bearer ${accessToken}`);
      expect(roadmap.status).toBe(200);
      const nodes = roadmap.body.data.roadmap.flatMap((c: any) => c.modules.flatMap((m: any) => m.lessons));
      const startNode = nodes.find((n: any) => n.id === start!.id);
      expect(startNode?.isUnlocked).toBe(true);
      // Placed-past lessons stay open, but are never the current lesson.
      expect(nodes.find((n: any) => n.id === inDomain('english')[0].id)?.isUnlocked).toBe(true);
      expect(inDomain('english').indexOf(inDomain('english').find((n) => n.id === roadmap.body.data.currentLesson?.id)!))
        .not.toBe(0);
    });
  });
});
