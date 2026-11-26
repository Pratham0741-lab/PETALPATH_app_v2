/**
 * Speak activities only record a score the child earned.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { scoreOnProceed } from '../speakRecording';

describe('coming-soon speaking', () => {
  it('records nothing (was completeActivity(100))', () => {
    assert.equal(scoreOnProceed('coming-soon', 'next'), null);
    assert.equal(scoreOnProceed('coming-soon', 'skip'), null);
  });
});

describe('Hindi practice (unscored)', () => {
  it('records nothing, whichever way the child moves on', () => {
    assert.equal(scoreOnProceed('practice', 'next'), null);
    assert.equal(scoreOnProceed('practice', 'skip'), null);
  });
});

describe('scored speaking', () => {
  it('Skip still records 0', () => {
    assert.equal(scoreOnProceed('scored', 'skip'), 0);
  });
  it('Next after a recognised attempt records nothing more (the attempt already saved its score)', () => {
    assert.equal(scoreOnProceed('scored', 'next'), null);
  });
});
