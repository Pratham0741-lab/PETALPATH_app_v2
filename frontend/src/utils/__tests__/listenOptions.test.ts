/** Listening options named after the audio (npm run test:unit). */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listenOptionsFromAudio } from '../listenOptions';

describe('listenOptionsFromAudio', () => {
  it('alphabet clips say "Capital G": options are capitals', () => {
    const o = listenOptionsFromAudio('audio/PRE_NURSERY/alphabet_007_g.mp3')!;
    assert.equal(o.correct, 'Capital G');
    assert.equal(o.options.length, 4);
    assert.ok(o.options.includes('Capital G'));
    assert.ok(o.options.every((x) => /^Capital [A-Z]$/.test(x)));
    assert.equal(new Set(o.options).size, 4);
  });

  it('numbers, shapes and lines use the audio word', () => {
    assert.equal(listenOptionsFromAudio('audio/NURSERY/numbers/numbers_003_three.mp3')!.correct, 'Three');
    assert.equal(listenOptionsFromAudio('audio/NURSERY/shapes/shapes_002_oval.mp3')!.correct, 'Oval');
    assert.equal(
      listenOptionsFromAudio('audio/PRE_NURSERY/lines_curves_001_standing_line.mp3')!.correct,
      'Standing Line',
    );
    const shapes = listenOptionsFromAudio('audio/NURSERY/shapes/shapes_002_oval.mp3')!;
    assert.ok(shapes.options.every((x) => ['Circle', 'Oval', 'Triangle', 'Square', 'Rectangle', 'Pentagon'].includes(x)));
  });

  it('Nursery letter narration uses "Letter"', () => {
    assert.equal(listenOptionsFromAudio('audio/NURSERY/english_001_letter_a_listen.mp3')!.correct, 'Letter A');
  });

  it('works on a full CDN URL and returns null for unknown audio', () => {
    assert.equal(listenOptionsFromAudio('https://cdn.example/audio/PRE_NURSERY/alphabet_026_z.mp3')!.correct, 'Capital Z');
    assert.equal(listenOptionsFromAudio('audio/LKG/english_005_x_listen.mp3'), null);
    assert.equal(listenOptionsFromAudio(null), null);
  });
});
