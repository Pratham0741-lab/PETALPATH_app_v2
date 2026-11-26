/**
 * Unscored practice (Hindi speaking while scoring is off) never blocks or
 * counts toward a lesson's progress.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isUnscoredPractice, practiceAudioUrl, scoredActivities } from '../practiceActivity';

describe('isUnscoredPractice', () => {
  it('only an explicit scored: false is practice (older servers send nothing = scored)', () => {
    assert.equal(isUnscoredPractice({ scored: false }), true);
    assert.equal(isUnscoredPractice({ scored: true }), false);
    assert.equal(isUnscoredPractice({}), false);
    assert.equal(isUnscoredPractice(null), false);
  });

  it('scoredActivities leaves practice out of counts', () => {
    const acts = [{ id: 'v', scored: true }, { id: 's', scored: false }, { id: 'w' }];
    assert.deepEqual(scoredActivities(acts).map((a) => a.id), ['v', 'w']);
  });
});

describe('practiceAudioUrl', () => {
  const listen = { activityType: 'listen', audio: { audioUrl: 'https://cdn/x.mp3', filename: 'x.mp3' } };
  const speak = { activityType: 'speak', audio: null };

  it("uses the lesson's Listen audio when the speaking activity has none", () => {
    assert.equal(practiceAudioUrl(speak, [speak, listen]), 'https://cdn/x.mp3');
  });

  it("prefers the speaking activity's own audio", () => {
    const own = { activityType: 'speak', audio: { audioUrl: 'https://cdn/own.mp3', filename: 'own.mp3' } };
    assert.equal(practiceAudioUrl(own, [own, listen]), 'https://cdn/own.mp3');
  });

  it('ignores coming-soon audio, and returns null when nothing is playable', () => {
    const soon = { activityType: 'listen', audio: { audioUrl: 'https://cdn/coming_soon', filename: 'coming_soon' } };
    assert.equal(practiceAudioUrl(speak, [speak, soon]), null);
    assert.equal(practiceAudioUrl(speak, [speak]), null);
  });
});
