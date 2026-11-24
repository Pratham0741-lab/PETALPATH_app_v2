/**
 * Deletion confirmations and the steps after the server answers.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ACCOUNT_DELETION_MESSAGE,
  childDeletionMessage,
  deleteAccount,
  deleteChildProfile,
  mentionsChild,
  outcomeMessage,
  outcomeOfError,
  withoutChild,
  type DeletionOutcome,
} from '../deletionFlow';
import { BACKUP_RETENTION_DAYS } from '../../../config/privacy';

const apiError = (statusCode: number) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });

function recorder() {
  const calls: string[] = [];
  return {
    calls,
    step: (name: string, fail = false) => async () => {
      calls.push(name);
      if (fail) throw new Error(`${name} failed`);
    },
  };
}

describe('confirmation wording', () => {
  it('says what is deleted, that it cannot be undone, and the backup window', () => {
    const child = childDeletionMessage('Aaryan');
    for (const text of [child, ACCOUNT_DELETION_MESSAGE]) {
      assert.match(text, /cannot be undone/);
      assert.match(text, new RegExp(`up to ${BACKUP_RETENTION_DAYS} days`));
    }
    assert.match(child, /Aaryan's profile/);
    assert.match(child, /progress/);
    assert.match(ACCOUNT_DELETION_MESSAGE, /every child profile/);
    assert.match(ACCOUNT_DELETION_MESSAGE, /signed out/);
  });

  it('the backup window matches the backup script', () => {
    const script = fs.readFileSync(path.join(__dirname, '../../../../../scripts/backup-db.sh'), 'utf8');
    const days = Number(script.match(/^RETENTION_DAYS=(\d+)$/m)?.[1]);
    assert.equal(days, BACKUP_RETENTION_DAYS);
  });
});

describe('server answers', () => {
  it('only a success (or an already-gone child) counts as deleted', () => {
    assert.equal(outcomeOfError(apiError(404), 'child'), 'deleted');
    assert.equal(outcomeOfError(apiError(404), 'account'), 'failed');
    assert.equal(outcomeOfError(apiError(403), 'account'), 'reauth_failed');
    assert.equal(outcomeOfError(apiError(403), 'child'), 'failed');
    assert.equal(outcomeOfError(apiError(429), 'account'), 'rate_limited');
    assert.equal(outcomeOfError(apiError(401), 'account'), 'signed_out');
    assert.equal(outcomeOfError(apiError(500), 'child'), 'failed');
    assert.equal(outcomeOfError(apiError(0), 'child'), 'failed');
    assert.equal(outcomeOfError(networkError(), 'child'), 'failed');
    assert.equal(outcomeOfError(networkError(), 'account'), 'failed');
    assert.equal(outcomeOfError(undefined, 'account'), 'failed');
  });

  it('every non-deleted outcome tells the parent nothing was deleted (or to check)', () => {
    const notDeleted: DeletionOutcome[] = ['reauth_failed', 'rate_limited', 'failed'];
    for (const kind of ['child', 'account'] as const) {
      for (const o of notDeleted) {
        const { title, message } = outcomeMessage(o, kind);
        assert.equal(title, 'Not deleted');
        assert.match(message, /Nothing was deleted/);
      }
      assert.doesNotMatch(outcomeMessage('signed_out', kind).title, /deleted/i);
      assert.match(outcomeMessage('deleted', kind).title, /deleted/);
    }
  });
});

describe('deleting a child profile', () => {
  it('after the server confirms: forgets the child locally, then refreshes the list', async () => {
    const r = recorder();
    const outcome = await deleteChildProfile('child-1', {
      deleteOnServer: r.step('server'),
      forgetLocally: r.step('forget'),
      refreshProfiles: r.step('refresh'),
    });
    assert.equal(outcome, 'deleted');
    assert.deepEqual(r.calls, ['server', 'forget', 'refresh']);
  });

  it('a network failure changes nothing on the device and is not "deleted"', async () => {
    const r = recorder();
    const outcome = await deleteChildProfile('child-1', {
      deleteOnServer: async () => {
        throw networkError();
      },
      forgetLocally: r.step('forget'),
      refreshProfiles: r.step('refresh'),
    });
    assert.equal(outcome, 'failed');
    assert.deepEqual(r.calls, []);
  });

  it('a child the server no longer has is cleaned up like a deletion', async () => {
    const r = recorder();
    const outcome = await deleteChildProfile('child-1', {
      deleteOnServer: async () => {
        throw apiError(404);
      },
      forgetLocally: r.step('forget'),
      refreshProfiles: r.step('refresh'),
    });
    assert.equal(outcome, 'deleted');
    assert.deepEqual(r.calls, ['forget', 'refresh']);
  });

  it('a local cleanup failure does not hide a confirmed deletion', async () => {
    const r = recorder();
    const outcome = await deleteChildProfile('child-1', {
      deleteOnServer: r.step('server'),
      forgetLocally: r.step('forget', true),
      refreshProfiles: r.step('refresh'),
    });
    assert.equal(outcome, 'deleted');
    assert.deepEqual(r.calls, ['server', 'forget', 'refresh']);
  });
});

describe('deleting the account', () => {
  it('after the server confirms: wipes the device', async () => {
    const r = recorder();
    const outcome = await deleteAccount({ password: 'pw' }, { deleteOnServer: r.step('server'), wipeDevice: r.step('wipe') });
    assert.equal(outcome, 'deleted');
    assert.deepEqual(r.calls, ['server', 'wipe']);
  });

  it('never wipes or reports "deleted" when the server did not confirm', async () => {
    for (const error of [networkError(), apiError(500), apiError(403), apiError(429), apiError(401)]) {
      const r = recorder();
      const outcome = await deleteAccount(
        { googleIdToken: 't' },
        {
          deleteOnServer: async () => {
            throw error;
          },
          wipeDevice: r.step('wipe'),
        },
      );
      assert.notEqual(outcome, 'deleted');
      assert.deepEqual(r.calls, []);
    }
  });

  it('passes the proof through unchanged', async () => {
    let sent: unknown;
    await deleteAccount({ password: 'secret' }, {
      deleteOnServer: async (p) => {
        sent = p;
      },
      wipeDevice: async () => undefined,
    });
    assert.deepEqual(sent, { password: 'secret' });
  });

  it('a wipe failure still reports the confirmed deletion', async () => {
    const outcome = await deleteAccount({ password: 'pw' }, {
      deleteOnServer: async () => undefined,
      wipeDevice: async () => {
        throw new Error('storage');
      },
    });
    assert.equal(outcome, 'deleted');
  });
});

describe('per-child local data', () => {
  it('drops only that child from a per-child map', () => {
    assert.deepEqual(withoutChild({ a: 1, b: 2 }, 'a'), { b: 2 });
    assert.deepEqual(withoutChild(null, 'a'), {});
  });

  it('finds queued requests about the child by URL or body', () => {
    assert.equal(mentionsChild({ url: '/children/c1/baseline' }, 'c1'), true);
    assert.equal(mentionsChild({ url: '/progress', body: { childId: 'c1' } }, 'c1'), true);
    assert.equal(mentionsChild({ url: '/progress', body: { childId: 'c2' } }, 'c1'), false);
  });
});
