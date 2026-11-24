import supertest from 'supertest';
import crypto from 'crypto';
import { jest } from '@jest/globals';

/**
 * Deleting a child profile (DELETE /api/children/:id) and a parent account
 * (DELETE /api/account).
 *
 * Every table in the deletion plan gets rows for two families (row-factory.ts
 * builds valid rows from the database's own metadata). Each test compares the
 * row count of EVERY table before and after, against a ledger of which rows
 * belong to whom: a deletion must remove exactly the deleted person's rows,
 * nothing else, and nothing of theirs may remain.
 *
 * Limits are set before anything imports config/env.ts.
 */
const ACCOUNT_MAX = 4;
const CHILD_MAX = 6;
process.env.ACCOUNT_DELETE_MAX = String(ACCOUNT_MAX);
process.env.CHILD_DELETE_MAX = String(CHILD_MAX);
await import('../helpers/setup.js');
const { default: app } = await import('../../app.js');
const { prisma } = await import('../../config/database.js');
const { logger } = await import('../../utils/logger.js');
const { Prisma } = await import('@prisma/client');
const { OAuth2Client } = await import('google-auth-library');
const { generateAccessToken } = await import('../../utils/jwt.js');
const { RowFactory, countAllTables, diffCounts } = await import('../helpers/row-factory.js');
const { CHILD_STEPS, USER_STEPS, isVia, missingFromPlan } = await import('../../modules/account-deletion/deletion-plan.js');
const { REAUTH_MAX_AGE_MS, countUserData } = await import('../../modules/account-deletion/account-deletion.service.js');

const request = supertest(app);
type Step = (typeof CHILD_STEPS)[number];

/* ------------------------------ fixtures ---------------------------------- */

let rows: InstanceType<typeof RowFactory>;
beforeEach(() => {
  rows = new RowFactory();
});

const uniqueEmail = () => `del-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@example.com`;

interface Family {
  label: string;
  userId: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  children: { id: string; label: string }[];
}

/** One row in every step's table for this person (via steps: their parent row too). */
async function fill(
  steps: readonly Step[],
  person: { childId?: string; userId: string },
  owner: string,
  parentOwner = owner,
) {
  for (const step of steps) {
    if (isVia(step)) {
      const parent = await rows.insert(step.via.table, person, {}, owner, parentOwner);
      await rows.insert(step.table, person, { [step.column]: String(parent[step.via.key]) }, owner, parentOwner);
    } else {
      await rows.insert(step.table, person, {}, owner, parentOwner);
    }
  }
}

/** A registered parent with `childCount` children, each with data in every table. */
async function family(label: string, childCount: number, provider: 'email' | 'google' = 'email'): Promise<Family> {
  const email = uniqueEmail();
  const password = 'Password123!';
  const reg = await request.post('/api/auth/register').send({ name: 'Parent', email, password });
  expect(reg.status).toBe(201);
  const userId = reg.body.data.user.id as string;
  if (provider === 'google') {
    await prisma.user.update({ where: { id: userId }, data: { provider: 'google', googleId: `g-${userId}`, passwordHash: null } });
  }
  const children: Family['children'] = [];
  for (let i = 0; i < childCount; i++) {
    const child = await prisma.child.create({
      data: { userId, name: `Kid ${i}`, age: 4, ageGroup: '4–5 years', avatar: 'panda' },
    });
    const childLabel = `${label}.child${i}`;
    children.push({ id: child.id, label: childLabel });
    await fill(CHILD_STEPS, { childId: child.id, userId }, childLabel, `${label}.user`);
  }
  await fill(USER_STEPS, { userId }, `${label}.user`);
  return {
    label,
    userId,
    email,
    password,
    accessToken: reg.body.data.accessToken,
    refreshToken: reg.body.data.refreshToken,
    children,
  };
}

const owned = (...owners: string[]) => rows.owned(...owners);
/** Adds the person tables themselves (created outside the factory). */
const plus = (base: Record<string, number>, extra: Record<string, number>) => {
  const out = { ...base };
  for (const [t, n] of Object.entries(extra)) out[t] = (out[t] ?? 0) + n;
  return out;
};

const deleteChild = (token: string, childId: string) =>
  request.delete(`/api/children/${childId}`).set('Authorization', `Bearer ${token}`);
const deleteAccount = (token: string, body: object) =>
  request.delete('/api/account').set('Authorization', `Bearer ${token}`).send(body);

/* ---------------------------- Google tokens -------------------------------- */

const KID = 'deletion-test-key';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const b64url = (v: object | Buffer) => (Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))).toString('base64url');

function googleToken(claims: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT', kid: KID });
  const body = b64url({
    iss: 'https://accounts.google.com',
    aud: process.env.GOOGLE_CLIENT_ID,
    email: 'someone@example.com',
    email_verified: true,
    iat: now,
    exp: now + 3600,
    ...claims,
  });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey);
  return `${header}.${body}.${b64url(sig)}`;
}

beforeAll(() => {
  // Google's library checks these tokens for real, against the test key.
  jest
    .spyOn(OAuth2Client.prototype as unknown as { getFederatedSignonCertsAsync: () => Promise<unknown> }, 'getFederatedSignonCertsAsync')
    .mockImplementation(async () => ({ certs: { [KID]: publicPem }, format: 'PEM' }));
});
afterAll(() => jest.restoreAllMocks());

/* ------------------------------- tests ------------------------------------ */

describe('deletion plan coverage', () => {
  it('covers every foreign key into a deleted table, in the real database', async () => {
    const fks = await prisma.$queryRawUnsafe<{ table: string; column: string; references: string }[]>(`
      SELECT cl.relname AS table, a.attname AS column, rcl.relname AS references
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = cl.relnamespace
      JOIN pg_class rcl ON rcl.oid = c.confrelid
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f' AND n.nspname = 'public'`);
    expect(missingFromPlan(fks)).toEqual([]);
  });

  it('covers every relation into a deleted table, in schema.prisma', () => {
    const models = Prisma.dmmf.datamodel.models;
    const tableOf = Object.fromEntries(models.map((m) => [m.name, m.dbName ?? m.name]));
    const fks = models.flatMap((m) =>
      m.fields
        .filter((f) => f.kind === 'object' && f.relationFromFields?.length)
        .map((f) => {
          const col = m.fields.find((x) => x.name === f.relationFromFields![0])!;
          return { table: tableOf[m.name], column: col.dbName ?? col.name, references: tableOf[f.type] };
        }),
    );
    expect(missingFromPlan(fks)).toEqual([]);
  });
});

describe('DELETE /api/children/:id', () => {
  it("removes the child and every row of theirs; siblings and other families are untouched", async () => {
    const a = await family('A', 2);
    const b = await family('B', 1);
    const [target, sibling] = a.children;
    const before = await countAllTables();

    const res = await deleteChild(a.accessToken, target.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { deleted: true } });

    const removed = diffCounts(before, await countAllTables());
    expect(removed).toEqual(plus(owned(target.label), { children: 1 }));

    expect(await prisma.child.findUnique({ where: { id: target.id } })).toBeNull();
    expect(await prisma.child.findUnique({ where: { id: sibling.id } })).not.toBeNull();
    expect(await prisma.child.findUnique({ where: { id: b.children[0].id } })).not.toBeNull();
  });

  it('also removes a profile the old delete only marked deleted', async () => {
    const a = await family('A', 1);
    await prisma.child.update({ where: { id: a.children[0].id }, data: { deletedAt: new Date() } });
    const before = await countAllTables();
    expect((await deleteChild(a.accessToken, a.children[0].id)).status).toBe(200);
    expect(diffCounts(before, await countAllTables())).toEqual(plus(owned(a.children[0].label), { children: 1 }));
  });

  it("answers 404 for another family's child, and deletes nothing", async () => {
    const a = await family('A', 1);
    const b = await family('B', 1);
    const before = await countAllTables();
    const res = await deleteChild(a.accessToken, b.children[0].id);
    expect(res.status).toBe(404);
    expect(await countAllTables()).toEqual(before);
  });

  it('is idempotent: a repeat or unknown id changes nothing and answers 404', async () => {
    const a = await family('A', 1);
    expect((await deleteChild(a.accessToken, a.children[0].id)).status).toBe(200);
    const after = await countAllTables();
    expect((await deleteChild(a.accessToken, a.children[0].id)).status).toBe(404);
    expect((await deleteChild(a.accessToken, crypto.randomUUID())).status).toBe(404);
    expect(await countAllTables()).toEqual(after);
  });

  it("a token scoped to the deleted child stops working at once", async () => {
    const a = await family('A', 1);
    const childToken = generateAccessToken({ userId: a.userId, role: 'PARENT', childId: a.children[0].id });
    expect((await request.get('/api/auth/me').set('Authorization', `Bearer ${childToken}`)).status).toBe(200);
    expect((await deleteChild(a.accessToken, a.children[0].id)).status).toBe(200);
    expect((await request.get('/api/auth/me').set('Authorization', `Bearer ${childToken}`)).status).toBe(401);
  });

  it('rolls everything back if any part fails', async () => {
    const a = await family('A', 1);
    const id = a.children[0].id;
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION pp_test_block_delete() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'blocked by test'; END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER pp_test_block BEFORE DELETE ON "children" FOR EACH ROW WHEN (OLD.id = '${id}') EXECUTE FUNCTION pp_test_block_delete()`,
    );
    try {
      const before = await countAllTables();
      const res = await deleteChild(a.accessToken, id);
      expect(res.status).toBe(500);
      expect(await countAllTables()).toEqual(before);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS pp_test_block ON "children"`);
    }
  });

  it(`limits each parent to ${CHILD_MAX} deletions per window`, async () => {
    const a = await family('A', 0);
    for (let i = 0; i < CHILD_MAX; i++) expect((await deleteChild(a.accessToken, crypto.randomUUID())).status).toBe(404);
    expect((await deleteChild(a.accessToken, crypto.randomUUID())).status).toBe(429);
  });
});

describe('DELETE /api/account', () => {
  it('with the password: removes the parent, all children and all their data; other families untouched', async () => {
    const a = await family('A', 2);
    const b = await family('B', 1);
    // The website stores waitlist emails lowercased; matching is case-insensitive either way.
    await prisma.waitlist.create({ data: { email: a.email.toLowerCase(), name: 'Parent' } });
    await prisma.waitlist.create({ data: { email: b.email.toLowerCase(), name: 'Other' } });
    const before = await countAllTables();

    const res = await deleteAccount(a.accessToken, { password: a.password });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { deleted: true } });

    const removed = diffCounts(before, await countAllTables());
    const expected = plus(owned('A.user', ...a.children.map((c) => c.label)), {
      children: a.children.length,
      users: 1,
      refresh_tokens: 1, // the session from registering
      waitlists: 1,
    });
    // Children created by the factory for user-level rows are part of A too.
    expect(removed).toEqual(expected);

    expect(await prisma.user.findUnique({ where: { id: a.userId } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: b.userId } })).not.toBeNull();
  });

  it('every token of the deleted account stops working at once', async () => {
    const a = await family('A', 1);
    const login = await request.post('/api/auth/login').send({ email: a.email, password: a.password });
    expect(login.status).toBe(200);

    expect((await deleteAccount(a.accessToken, { password: a.password })).status).toBe(200);

    for (const token of [a.accessToken, login.body.data.accessToken]) {
      expect((await request.get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    }
    for (const token of [a.refreshToken, login.body.data.refreshToken]) {
      expect((await request.post('/api/auth/refresh').send({ refreshToken: token })).status).toBe(401);
    }
    expect(await prisma.refreshToken.count({ where: { userId: a.userId } })).toBe(0);
  });

  it('refuses a wrong password, a missing proof, or both proofs; nothing is deleted', async () => {
    const a = await family('A', 1);
    const before = await countAllTables();
    expect((await deleteAccount(a.accessToken, { password: 'wrong-password' })).status).toBe(401);
    expect((await deleteAccount(a.accessToken, {})).status).toBe(400);
    expect((await deleteAccount(a.accessToken, { password: a.password, googleIdToken: 'x' })).status).toBe(400);
    expect(await countAllTables()).toEqual(before);
  });

  it('requires a signed-in caller', async () => {
    expect((await request.delete('/api/account').send({ password: 'x' })).status).toBe(401);
  });

  describe('Google accounts', () => {
    it('accepts a fresh Google sign-in for the same Google account', async () => {
      const a = await family('A', 1, 'google');
      const res = await deleteAccount(a.accessToken, { googleIdToken: googleToken({ sub: `g-${a.userId}` }) });
      expect(res.status).toBe(200);
      expect(await prisma.user.findUnique({ where: { id: a.userId } })).toBeNull();
    });

    it('refuses an expired token, one older than the re-auth window, another account, or a password', async () => {
      const a = await family('A', 1, 'google');
      const sub = `g-${a.userId}`;
      const now = Math.floor(Date.now() / 1000);
      const stale = now - Math.ceil(REAUTH_MAX_AGE_MS / 1000) - 60;
      const before = await countAllTables();

      const attempts = [
        { googleIdToken: googleToken({ sub, iat: now - 7200, exp: now - 3600 }) }, // expired
        { googleIdToken: googleToken({ sub, iat: stale }) }, // valid but not recent
        { googleIdToken: googleToken({ sub: 'someone-else' }) }, // another Google account
      ];
      for (const body of attempts) expect((await deleteAccount(a.accessToken, body)).status).toBe(401);
      expect(await countAllTables()).toEqual(before);
    });

    it('a Google-only account cannot use a password', async () => {
      const a = await family('A', 0, 'google');
      expect((await deleteAccount(a.accessToken, { password: a.password })).status).toBe(401);
    });
  });

  it('rolls everything back if any part fails', async () => {
    const a = await family('A', 1);
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION pp_test_block_delete() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'blocked by test'; END $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER pp_test_block BEFORE DELETE ON "users" FOR EACH ROW WHEN (OLD.id = '${a.userId}') EXECUTE FUNCTION pp_test_block_delete()`,
    );
    try {
      const before = await countAllTables();
      expect((await deleteAccount(a.accessToken, { password: a.password })).status).toBe(500);
      expect(await countAllTables()).toEqual(before);
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS pp_test_block ON "users"`);
    }
  });

  it(`limits each parent to ${ACCOUNT_MAX} attempts per window`, async () => {
    const a = await family('A', 0);
    for (let i = 0; i < ACCOUNT_MAX; i++) expect((await deleteAccount(a.accessToken, { password: 'wrong' })).status).toBe(401);
    expect((await deleteAccount(a.accessToken, { password: a.password })).status).toBe(429);
    expect(await prisma.user.findUnique({ where: { id: a.userId } })).not.toBeNull();
  });
});

describe('operator dry-run counts', () => {
  it('count the same rows the deletion then removes', async () => {
    const a = await family('A', 2);
    await family('B', 1);
    await prisma.waitlist.create({ data: { email: a.email.toLowerCase(), name: 'Parent' } });
    const counts = await countUserData(prisma, a.userId, a.email);
    const predicted = Object.values(counts).reduce((x, y) => x + y, 0);

    const before = await countAllTables();
    expect((await deleteAccount(a.accessToken, { password: a.password })).status).toBe(200);
    const removed = Object.values(diffCounts(before, await countAllTables())).reduce((x, y) => x + y, 0);
    expect(predicted).toBe(removed);
    expect(counts.children).toBe(a.children.length + (owned('A.user').children ?? 0));
    expect(counts.waitlists).toBe(1);
  });
});

describe('logging', () => {
  it('request and error logs mask the id of a deleted child', async () => {
    const { logSafeUrl } = await import('../../utils/log-safe-url.js');
    expect(logSafeUrl('DELETE', '/api/children/abc-123')).toBe('/api/children/:id');
    expect(logSafeUrl('delete', '/api/children/abc-123?x=1')).toBe('/api/children/:id?x=1');
    expect(logSafeUrl('GET', '/api/children/abc-123')).toBe('/api/children/abc-123');
    expect(logSafeUrl('DELETE', '/api/account')).toBe('/api/account');
  });

  it('never logs emails, names or child ids for a deletion', async () => {
    const calls: unknown[][] = [];
    const levels = ['info', 'warn', 'error', 'debug'] as const;
    const spies = levels.map((l) =>
      jest.spyOn(logger, l).mockImplementation(((...args: unknown[]) => void calls.push(args)) as never),
    );
    try {
      const a = await family('A', 2);
      await deleteChild(a.accessToken, a.children[0].id);
      await deleteChild(a.accessToken, a.children[0].id); // 404 path
      await deleteAccount(a.accessToken, { password: 'wrong' }); // refused path
      await deleteAccount(a.accessToken, { password: a.password });
      const text = JSON.stringify(calls);
      expect(text).toContain('deletion');
      for (const secret of [a.email, ...a.children.map((c) => c.id), 'Kid 0', 'Kid 1']) {
        expect(text).not.toContain(secret);
      }
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  });
});
