/**
 * Real deletion of a child profile, or of a whole parent account.
 *
 * Each runs in one transaction, deleting every table in deletion-plan.ts
 * explicitly (no reliance on cascades). The rows being deleted are locked
 * first (SELECT ... FOR UPDATE), so a write for that child or parent arriving
 * mid-deletion waits and then fails its foreign key instead of leaving an
 * orphan behind.
 *
 * Nothing here logs emails, names or child ids.
 */
import bcrypt from 'bcrypt';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { authService } from '../users/auth.service.js';
import { CHILD_STEPS, USER_STEPS, countQueries, deleteSql, type Step } from './deletion-plan.js';

/** A Google ID token proves recent sign-in only if Google issued it this recently. */
export const REAUTH_MAX_AGE_MS = 5 * 60 * 1000;

export type Reauth = { password: string } | { googleIdToken: string };

type Db = Prisma.TransactionClient | PrismaClient;

async function runSteps(tx: Db, steps: readonly Step[], ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  for (const step of steps) {
    await tx.$executeRawUnsafe(deleteSql(step), [...ids]);
  }
}

/** Distinct rows per table that deletion would remove (non-zero tables only). */
async function countRows(db: Db, userIds: readonly string[], childIds: readonly string[]) {
  const counts: Record<string, number> = {};
  for (const { table, sql } of countQueries(userIds.length ? USER_STEPS : [], CHILD_STEPS)) {
    const rows = await db.$queryRawUnsafe<{ n: number }[]>(sql, [...userIds], [...childIds]);
    if (rows[0].n > 0) counts[table] = rows[0].n;
  }
  return counts;
}

/** Deletes the given children (already locked, already checked) and all their data. */
async function deleteChildrenRows(tx: Db, childIds: readonly string[]): Promise<void> {
  await runSteps(tx, CHILD_STEPS, childIds);
  if (childIds.length) {
    await tx.$executeRawUnsafe(`DELETE FROM "children" WHERE "id" = ANY($1::text[])`, [...childIds]);
  }
}

/** Deletes a user, their children, all data of both, and any waitlist row for their email. */
async function deleteUserRows(tx: Db, userId: string, email: string): Promise<void> {
  const children = await tx.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "children" WHERE "user_id" = $1 FOR UPDATE`,
    userId,
  );
  await runSteps(tx, USER_STEPS, [userId]);
  await deleteChildrenRows(
    tx,
    children.map((c) => c.id),
  );
  await tx.$executeRawUnsafe(`DELETE FROM "users" WHERE "id" = $1`, userId);
  await tx.$executeRawUnsafe(`DELETE FROM "waitlists" WHERE lower("email") = lower($1)`, email);
}

export class AccountDeletionService {
  /**
   * Hard-deletes one of the parent's children. Any child id that is not this
   * parent's (someone else's, never existed, already deleted) is a 404, so the
   * answer never reveals whether another family's child exists. Repeating a
   * deletion therefore changes nothing and answers 404.
   *
   * Profiles that were only marked deleted (the old soft delete) are found too,
   * so a parent can still remove them for good.
   */
  async deleteChild(userId: string, childId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const owned = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "children" WHERE "id" = $1 AND "user_id" = $2 FOR UPDATE`,
        childId,
        userId,
      );
      if (owned.length === 0) throw new NotFoundError('Child profile not found');
      await deleteChildrenRows(tx, [childId]);
    });
  }

  /**
   * Deletes the parent account and everything about it. The caller must prove
   * a recent sign-in: the account password, or a Google ID token issued in the
   * last REAUTH_MAX_AGE_MS for this same Google account.
   */
  async deleteAccount(userId: string, reauth: Reauth): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User account not found');
    await this.verifyRecentAuth(user, reauth);

    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT "id" FROM "users" WHERE "id" = $1 FOR UPDATE`,
        userId,
      );
      if (locked.length === 0) throw new UnauthorizedError('User account not found');
      await deleteUserRows(tx, userId, user.email);
    });
  }

  private async verifyRecentAuth(
    user: { passwordHash: string | null; googleId: string | null },
    reauth: Reauth,
  ): Promise<void> {
    // 403, not 401: the caller is signed in, but has not proved it is them.
    // (The app treats 401 as an expired session and would refresh and retry.)
    const refused = () => new ForbiddenError('Please confirm it is you: sign in again to delete the account');

    if ('password' in reauth) {
      if (!user.passwordHash) throw refused();
      if (!(await bcrypt.compare(reauth.password, user.passwordHash))) throw refused();
      return;
    }

    if (!user.googleId) throw refused();
    let payload;
    try {
      payload = await authService.verifyGoogleToken(reauth.googleIdToken);
    } catch {
      throw refused();
    }
    const issuedAtMs = (payload.iat ?? 0) * 1000;
    if (payload.sub !== user.googleId || Date.now() - issuedAtMs > REAUTH_MAX_AGE_MS) throw refused();
  }
}

export const accountDeletionService = new AccountDeletionService();

/* -------------------------------------------------------------------------- */
/* Operator scripts (prisma/*.ts): same plan, counts and deletion.             */
/* -------------------------------------------------------------------------- */

/** Rows that deleting this user would remove, per table. Counts only. */
export async function countUserData(db: Db, userId: string, email: string) {
  const children = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "children" WHERE "user_id" = $1`,
    userId,
  );
  const ids = children.map((c) => c.id);
  const waitlist = await db.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "waitlists" WHERE lower("email") = lower($1)`,
    email,
  );
  return {
    ...(await countRows(db, [userId], ids)),
    children: ids.length,
    users: 1,
    waitlists: waitlist[0].n,
  };
}

/** Rows that deleting these children would remove, per table. Counts only. */
export async function countChildrenData(db: Db, childIds: readonly string[]) {
  return { ...(await countRows(db, [], childIds)), children: childIds.length };
}

/** For prisma/delete-account-by-email.ts: delete a user found by email, in one transaction. */
export async function deleteUserForOperator(userId: string, email: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(`SELECT "id" FROM "users" WHERE "id" = $1 FOR UPDATE`, userId);
    await deleteUserRows(tx, userId, email);
  });
}

/** For prisma/delete-account-by-email.ts when only a waitlist row exists. */
export async function deleteWaitlistForOperator(email: string): Promise<number> {
  return prisma.$executeRawUnsafe(`DELETE FROM "waitlists" WHERE lower("email") = lower($1)`, email);
}

/** For prisma/purge-soft-deleted-children.ts: hard-delete children already marked deleted. */
export async function purgeChildrenForOperator(childIds: readonly string[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "children" WHERE "id" = ANY($1::text[]) AND "deleted_at" IS NOT NULL FOR UPDATE`,
      [...childIds],
    );
    await deleteChildrenRows(
      tx,
      locked.map((c) => c.id),
    );
  });
}
