/**
 * Deleting a child profile or the parent account: the words the parent sees,
 * and the steps, with the network and the device cleanup passed in so this
 * file has no React Native imports and can be unit-tested.
 *
 * The rule that matters: the app says "deleted" only when the server said so.
 * A network failure, a timeout or a server error is always "not deleted".
 */
import { BACKUP_RETENTION_DAYS } from '../../config/privacy';

export type DeletionOutcome =
  /** The server confirmed it (or, for a child, the profile was already gone). */
  | 'deleted'
  /** Account only: the password or Google sign-in did not match. */
  | 'reauth_failed'
  | 'rate_limited'
  /** The session ended (signed out elsewhere, or the account no longer exists). */
  | 'signed_out'
  /** Anything else, including no connection: nothing was deleted. */
  | 'failed';

/** An error from the API client; only the status matters here. */
const statusOf = (error: unknown): number | undefined => {
  const e = error as { statusCode?: unknown; status?: unknown; response?: { status?: unknown } } | null;
  const s = e?.statusCode ?? e?.status ?? e?.response?.status;
  return typeof s === 'number' && s > 0 ? s : undefined;
};

export function outcomeOfError(error: unknown, kind: 'child' | 'account'): DeletionOutcome {
  const status = statusOf(error);
  // A child id the server does not know is already gone: the same end state.
  if (kind === 'child' && status === 404) return 'deleted';
  if (kind === 'account' && status === 403) return 'reauth_failed';
  if (status === 429) return 'rate_limited';
  if (status === 401) return 'signed_out';
  return 'failed';
}

/* -------------------------------- wording --------------------------------- */

const BACKUPS = `Our nightly backups may keep a copy for up to ${BACKUP_RETENTION_DAYS} days before it is gone for good.`;

export function childDeletionMessage(childName: string): string {
  return [
    `This permanently deletes ${childName}'s profile and everything about them: their progress, stars, rewards, the starting check, lesson feedback and learning history.`,
    'It cannot be undone.',
    BACKUPS,
  ].join('\n\n');
}

export const ACCOUNT_DELETION_MESSAGE = [
  'This permanently deletes your PetalPath account: your sign-in, every child profile with all of their progress and learning history, your lesson feedback, and any website waitlist sign-up with this email.',
  'It cannot be undone, and you will be signed out on this device.',
  BACKUPS,
].join('\n\n');

export function outcomeMessage(outcome: DeletionOutcome, kind: 'child' | 'account'): { title: string; message: string } {
  switch (outcome) {
    case 'deleted':
      return kind === 'child'
        ? { title: 'Profile deleted', message: 'The profile and its data have been deleted.' }
        : { title: 'Account deleted', message: 'Your account and all of its data have been deleted.' };
    case 'reauth_failed':
      return {
        title: 'Not deleted',
        message: "That didn't confirm it's you. Check your password, or sign in with Google again. Nothing was deleted.",
      };
    case 'rate_limited':
      return { title: 'Not deleted', message: 'Too many attempts. Please wait 15 minutes and try again. Nothing was deleted.' };
    case 'signed_out':
      return {
        title: 'Signed out',
        message: 'Your session has ended. Please sign in again to check whether the deletion went through.',
      };
    case 'failed':
    default:
      return {
        title: 'Not deleted',
        message: "We couldn't reach PetalPath, or something went wrong. Nothing was deleted. Check your connection and try again.",
      };
  }
}

/* --------------------------------- steps ---------------------------------- */

export interface ChildDeletionDeps {
  deleteOnServer: (childId: string) => Promise<unknown>;
  /** Remove what this device keeps about the child (queues, per-child state, caches). */
  forgetLocally: (childId: string) => Promise<void>;
  /** Reload the profile list (and drop the active child if it was this one). */
  refreshProfiles: (deletedChildId: string) => Promise<void>;
}

export async function deleteChildProfile(childId: string, deps: ChildDeletionDeps): Promise<DeletionOutcome> {
  try {
    await deps.deleteOnServer(childId);
  } catch (error) {
    const outcome = outcomeOfError(error, 'child');
    if (outcome !== 'deleted') return outcome;
  }
  // Confirmed by the server: clean up. A local failure does not undo that.
  await deps.forgetLocally(childId).catch(() => undefined);
  await deps.refreshProfiles(childId).catch(() => undefined);
  return 'deleted';
}

export type AccountProof = { password: string } | { googleIdToken: string };

export interface AccountDeletionDeps {
  deleteOnServer: (proof: AccountProof) => Promise<unknown>;
  /** Sign out and wipe everything this device holds (storage, caches, queues). */
  wipeDevice: () => Promise<void>;
}

export async function deleteAccount(proof: AccountProof, deps: AccountDeletionDeps): Promise<DeletionOutcome> {
  try {
    await deps.deleteOnServer(proof);
  } catch (error) {
    return outcomeOfError(error, 'account');
  }
  await deps.wipeDevice().catch(() => undefined);
  return 'deleted';
}

/* ------------------------- per-child local data --------------------------- */

/** A copy of a map keyed by child id, without that child. */
export function withoutChild<T>(map: Record<string, T> | null | undefined, childId: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(map ?? {})) if (k !== childId) out[k] = v;
  return out;
}

/** True when a queued request is about this child (its URL or body names them). */
export function mentionsChild(item: { url?: string; body?: unknown }, childId: string): boolean {
  if (item.url?.includes(childId)) return true;
  try {
    return JSON.stringify(item.body ?? null).includes(childId);
  } catch {
    return false;
  }
}
