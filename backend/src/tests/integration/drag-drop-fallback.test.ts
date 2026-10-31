/**
 * Fallback "find the letter" drag-and-drop boards: the letters must vary,
 * not be the same A / B, C, D on every board. Pure: no database.
 */
import { fallbackBlueprint } from '../../shared/utils/drag-drop/blueprints.js';
import { generateDynamicDragDropSpec } from '../../shared/utils/spec-generator.js';

const letterBoard = (id: string, title: string) => fallbackBlueprint(id, title, undefined);

describe('fallback letter boards', () => {
  it('keeps the lesson’s own letter and never uses it as a decoy', () => {
    for (let i = 0; i < 50; i++) {
      const bp = letterBoard('pn_letter_q', 'Letter Q');
      expect(bp.slots[0]!.label).toBe('Q');
      expect(bp.distractors).toHaveLength(3);
      expect(bp.distractors).not.toContain('Q');
      expect(new Set(bp.distractors).size).toBe(3);
    }
  });

  it('varies the decoys between loads (no more fixed A, B, C)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add(letterBoard('pn_letter_w', 'Letter W').distractors!.join(''));
    expect(seen.size).toBeGreaterThan(10);
  });

  it('a lesson that names no letter gets a random target, not always A', () => {
    const targets = new Set<string>();
    for (let i = 0; i < 40; i++) targets.add(letterBoard('pn_myself', 'All About Me').slots[0]!.label);
    expect(targets.size).toBeGreaterThan(5);
  });

  it('is deterministic with an injected rng (for reproducible boards)', () => {
    const rng = () => 0.5;
    expect(fallbackBlueprint('pn_myself', 'All About Me', undefined, rng)).toEqual(
      fallbackBlueprint('pn_myself', 'All About Me', undefined, rng),
    );
  });

  it('still builds a playable spec: every tile text appears once, the answer is accepted', () => {
    const spec = generateDynamicDragDropSpec('pn_letter_k', 'Letter K');
    const texts = spec.draggables.map((d: any) => d.content);
    expect(new Set(texts).size).toBe(4);
    const answer = spec.draggables.find((d: any) => d.content === 'K');
    expect(spec.dropZones[0].acceptedDraggableIds).toEqual([answer.id]);
  });
});
