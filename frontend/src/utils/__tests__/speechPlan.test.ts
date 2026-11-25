/**
 * Choosing on-device vs network speech recognition, and the language.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isUnavailableError, pickLocale, planAfterUnavailable, planSpeech, type SpeechProbe } from '../speechPlan';

const phone = (over: Partial<SpeechProbe> = {}): SpeechProbe => ({
  moduleLoaded: true,
  recognitionAvailable: true,
  onDeviceSupported: true,
  installedLocales: ['en-IN', 'en-US'],
  supportedLocales: ['en-IN', 'en-US', 'hi-IN'],
  ...over,
});

describe('language', () => {
  it('prefers en-IN, then en-US, matching case and separator loosely', () => {
    assert.equal(pickLocale(['en-US', 'en-IN']), 'en-IN');
    assert.equal(pickLocale(['en_us']), 'en-US');
    assert.equal(pickLocale(['hi-IN']), null);
  });
});

describe('prefer-on-device', () => {
  it('uses on-device with the installed language', () => {
    assert.deepEqual(planSpeech('prefer-on-device', phone()), { available: true, onDevice: true, lang: 'en-IN' });
    assert.deepEqual(planSpeech('prefer-on-device', phone({ installedLocales: ['en-US'] })), {
      available: true,
      onDevice: true,
      lang: 'en-US',
    });
  });

  it('falls back to the network when on-device is unsupported or has no English model', () => {
    for (const p of [phone({ onDeviceSupported: false }), phone({ installedLocales: ['hi-IN'] })]) {
      assert.deepEqual(planSpeech('prefer-on-device', p), { available: true, onDevice: false, lang: 'en-IN' });
    }
  });

  it('network language falls back to en-US when the support list is unknown', () => {
    assert.equal(planSpeech('prefer-on-device', phone({ onDeviceSupported: false, supportedLocales: [] })).lang, 'en-US');
  });

  it('is unavailable when no recognizer exists at all', () => {
    assert.equal(planSpeech('prefer-on-device', phone({ onDeviceSupported: false, recognitionAvailable: false })).available, false);
    assert.equal(planSpeech('prefer-on-device', phone({ moduleLoaded: false })).available, false);
  });
});

describe('on-device-only and network', () => {
  it('on-device-only never uses the network', () => {
    assert.equal(planSpeech('on-device-only', phone()).onDevice, true);
    assert.equal(planSpeech('on-device-only', phone({ onDeviceSupported: false })).available, false);
    assert.equal(planSpeech('on-device-only', phone({ installedLocales: [] })).available, false);
  });

  it('network mode never uses on-device', () => {
    assert.deepEqual(planSpeech('network', phone()), { available: true, onDevice: false, lang: 'en-IN' });
  });
});

describe('after "not available on this phone" errors', () => {
  it('recognises the two error codes, not ordinary failures', () => {
    assert.equal(isUnavailableError(new Error('language-not-supported')), true);
    assert.equal(isUnavailableError({ error: 'service-not-allowed' }), true);
    assert.equal(isUnavailableError(new Error('no-speech')), false);
    assert.equal(isUnavailableError(new Error('network')), false);
  });

  it('prefer-on-device: on-device -> network -> en-US -> unavailable', () => {
    const p = phone();
    const first = planSpeech('prefer-on-device', p);
    const second = planAfterUnavailable('prefer-on-device', first, p);
    assert.deepEqual(second, { available: true, onDevice: false, lang: 'en-IN' });
    const third = planAfterUnavailable('prefer-on-device', second, p);
    assert.deepEqual(third, { available: true, onDevice: false, lang: 'en-US' });
    assert.equal(planAfterUnavailable('prefer-on-device', third, p).available, false);
  });

  it('on-device-only gives up instead of using the network', () => {
    const p = phone();
    assert.equal(planAfterUnavailable('on-device-only', planSpeech('on-device-only', p), p).available, false);
  });
});
