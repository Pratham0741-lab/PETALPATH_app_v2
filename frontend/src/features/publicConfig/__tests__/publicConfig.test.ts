/**
 * Forgot-password honesty: the app only says "we've sent instructions" when
 * the server reports it can send email.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPublicConfigLoader,
  forgotPasswordOutcome,
  parsePublicConfig,
  SAFE_PUBLIC_CONFIG,
} from '../publicConfig';

const SUPPORT = 'support@example.com';

describe('parsePublicConfig', () => {
  it('is true only for a literal true', () => {
    assert.equal(parsePublicConfig({ success: true, data: { passwordResetEmail: true } }).passwordResetEmail, true);
    for (const body of [
      { success: true, data: { passwordResetEmail: false } },
      { success: true, data: { passwordResetEmail: 'true' } },
      { success: true, data: {} },
      {},
      null,
      'oops',
    ]) {
      assert.equal(parsePublicConfig(body).passwordResetEmail, false);
    }
  });
});

describe('loader', () => {
  it('defaults to false when the request fails, and retries next time', async () => {
    let calls = 0;
    const load = createPublicConfigLoader(async () => {
      calls++;
      if (calls === 1) throw new Error('offline');
      return { success: true, data: { passwordResetEmail: true } };
    });
    assert.deepEqual(await load(), SAFE_PUBLIC_CONFIG);
    assert.equal((await load()).passwordResetEmail, true);
    assert.equal((await load()).passwordResetEmail, true);
    assert.equal(calls, 2, 'a success is cached');
  });

  it('shares one request between concurrent callers', async () => {
    let calls = 0;
    const load = createPublicConfigLoader(async () => {
      calls++;
      return { success: true, data: { passwordResetEmail: false } };
    });
    await Promise.all([load(), load(), load()]);
    assert.equal(calls, 1);
  });
});

describe('forgot-password screen outcome', () => {
  it('email configured: generic wording and the reset-code button', () => {
    const o = forgotPasswordOutcome({ passwordResetEmail: true }, SUPPORT);
    assert.equal(o.kind, 'email-sent');
    assert.match(o.message, /If an account exists for that email, we've sent instructions/);
    assert.equal(o.showResetCodeButton, true);
  });

  it('email not configured: points to support, never claims an email was sent', () => {
    const o = forgotPasswordOutcome({ passwordResetEmail: false }, SUPPORT);
    assert.equal(o.kind, 'contact-support');
    assert.equal(o.message, `Email reset isn't available yet. Please email ${SUPPORT} and we'll help.`);
    assert.doesNotMatch(o.message, /sent/);
    assert.equal(o.showResetCodeButton, false);
  });
});
