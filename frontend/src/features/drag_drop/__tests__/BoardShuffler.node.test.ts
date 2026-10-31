/** Board shuffling (npm run test:unit). */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isGiveaway, shuffleBoard } from '../engine/BoardShuffler';
import { shuffleArray } from '../../../utils/shuffle';
import type { DragDropActivitySpec } from '../types';

const tile = (id: string, x: number, content: string) => ({
  id,
  contentType: 'text',
  content,
  position: { x, y: 400 },
  dimensions: { width: 140, height: 120 },
  behavior: {},
  accessibility: {},
  sortOrder: 0,
});
const zone = (id: string, x: number, accepts: string) => ({
  id,
  shape: { type: 'rectangle', position: { x, y: 100 }, dimensions: { width: 160, height: 140 } },
  acceptedDraggableIds: [accepts],
});

const board = {
  id: 'abc',
  draggables: [tile('t1', 40, 'A'), tile('t2', 200, 'B'), tile('t3', 360, 'C')],
  dropZones: [zone('z1', 30, 't1'), zone('z2', 190, 't2'), zone('z3', 350, 't3')],
} as unknown as DragDropActivitySpec;

const order = (s: DragDropActivitySpec) =>
  [...s.draggables].sort((a, b) => a.position.x - b.position.x).map((d) => d.content).join('');

describe('board shuffle', () => {
  it('produces different layouts across plays', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(order(shuffleBoard(board)));
    assert.ok(seen.size >= 3, `only saw ${[...seen].join(', ')}`);
  });

  it('never gives the answer away by position', () => {
    assert.equal(isGiveaway(board), true); // the authored layout is "drag straight up"
    for (let i = 0; i < 200; i++) assert.equal(isGiveaway(shuffleBoard(board)), false);
  });

  it('keeps answers, ids and the set of boxes intact', () => {
    const s = shuffleBoard(board);
    assert.deepEqual(s.dropZones.map((z) => z.acceptedDraggableIds), board.dropZones.map((z) => z.acceptedDraggableIds));
    assert.deepEqual(s.draggables.map((d) => d.id), ['t1', 't2', 't3']);
    assert.deepEqual(s.draggables.map((d) => d.position.x).sort(), [40, 200, 360].sort());
    assert.notEqual(s, board); // a copy; the original is untouched
    assert.equal(board.draggables[0]!.position.x, 40);
  });

  it('shuffleArray is a fair permutation', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 6000; i++) {
      const k = shuffleArray(['a', 'b', 'c']).join('');
      counts[k] = (counts[k] ?? 0) + 1;
    }
    assert.equal(Object.keys(counts).length, 6);
    for (const n of Object.values(counts)) assert.ok(n > 800 && n < 1200, JSON.stringify(counts));
  });
});
