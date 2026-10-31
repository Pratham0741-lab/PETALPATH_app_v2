/** One stop per screen (npm run test:unit). */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { oneActivityPerScreen } from '../activityNormalization';

const acts = (...types: string[]) => types.map((activityType, i) => ({ id: `a${i}`, activityType }));

describe('oneActivityPerScreen', () => {
  it('All About Me: video, listen, tap, select + drag-drop → Watch, Listen, Drag & drop', () => {
    const out = oneActivityPerScreen(acts('video', 'listen', 'tap', 'select', 'drag_drop'));
    assert.deepEqual(out.map((a) => a.activityType), ['video', 'listen', 'drag_drop']);
  });

  it('prefers the real listen activity over a tap that only falls back to Listen', () => {
    const out = oneActivityPerScreen(acts('video', 'tap', 'listen', 'speak'));
    assert.deepEqual(out.map((a) => a.id), ['a0', 'a2', 'a3']);
  });

  it('keeps one write screen for trace/draw-style lessons and keeps lesson order', () => {
    const out = oneActivityPerScreen(acts('video', 'listen', 'trace', 'write', 'drag_drop', 'match'));
    assert.deepEqual(out.map((a) => a.activityType), ['video', 'listen', 'write', 'drag_drop']);
  });

  it('leaves a lesson with one activity per screen unchanged', () => {
    const list = acts('video', 'listen', 'speak', 'drag_drop');
    assert.deepEqual(oneActivityPerScreen(list), list);
  });
});
