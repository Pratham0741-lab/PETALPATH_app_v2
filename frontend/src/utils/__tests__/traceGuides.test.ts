/**
 * Every item a revision lesson traces has a guide, and generated guides land
 * inside the board.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  generatedGuidePath,
  generatedGuidePoints,
  generatedGuideStrokes,
  guideNameForItem,
  hasGuideForItem,
} from '../traceGuides';
import { getGuidePoints } from '../tracingAccuracy';

const sets: Record<string, string[] | string> = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), '..', 'curriculum', 'revision', 'trace-sets.json'), 'utf8'),
);
const lists = Object.entries(sets).filter(([k]) => !k.startsWith('_')) as [string, string[]][];

describe('revision trace guides', () => {
  it('every item in every revision list has a guide', () => {
    const missing = lists.flatMap(([id, items]) => items.filter((i) => !hasGuideForItem(i)).map((i) => `${id}: ${i}`));
    assert.deepEqual(missing, []);
  });

  it('every character, capitals and digits included, uses a generated guide', () => {
    assert.equal(guideNameForItem('A'), 'Trace A');
    assert.equal(guideNameForItem('क'), 'Trace क');
    // Single-letter lessons name guides "Letter X" / "Number 7": same guides.
    for (const c of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']) {
      assert.deepEqual(getGuidePoints(`Letter ${c}`, 300, 300), generatedGuidePoints(`Trace ${c}`, 300, 300), c);
    }
    for (const d of [...'0123456789']) {
      assert.deepEqual(getGuidePoints(`Number ${d}`, 300, 300), generatedGuidePoints(`Trace ${d}`, 300, 300), d);
    }
  });

  it('generated guides fit inside the board and give scoring points', () => {
    const W = 320;
    const H = 400;
    for (const [, items] of lists) {
      for (const item of items) {
        const name = guideNameForItem(item);
        if (!name.startsWith('Trace ')) continue;
        const strokes = generatedGuideStrokes(name, W, H)!;
        assert.ok(strokes.length > 0, item);
        for (const p of strokes.flat()) {
          assert.ok(p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H, `${item} point off the board`);
        }
        assert.ok(generatedGuidePoints(name, W, H)!.length >= 10, `${item} has scoring points`);
        assert.ok(generatedGuidePath(name, W, H)!.d.startsWith('M '), item);
      }
    }
  });

  it('scoring uses the generated points for generated guides', () => {
    assert.deepEqual(getGuidePoints('Trace क', 300, 300), generatedGuidePoints('Trace क', 300, 300));
  });
});
