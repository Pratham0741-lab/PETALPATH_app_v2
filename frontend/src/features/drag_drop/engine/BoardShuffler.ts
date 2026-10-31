/**
 * Shuffles a drag-and-drop board each time it is played.
 *
 * Boards are generated once (backend/src/shared/utils/drag-drop/board.ts) and
 * shipped as files with fixed positions, so without this every attempt showed
 * the same layout — "A", "B", "C" always in the same places. Here the boxes
 * (position + size) are permuted among the tiles, and separately among the
 * drop zones, on every load.
 *
 * Safe by construction: answers are checked by id (`acceptedDraggableIds`),
 * never by position, and a tile's colour comes with the tile, which board.ts
 * already assigns independently of correctness. A permutation that leaves
 * every tile directly under the zone it answers ("drag straight up") is
 * rejected and reshuffled.
 */
import type { DragDropActivitySpec, DraggableItem, DropZone } from '../types';
import { shuffleArray } from '../../../utils/shuffle';

type Rng = () => number;

export { shuffleArray };

type Box = { x: number; y: number; width: number; height: number };

const tileBox = (d: DraggableItem): Box => ({ ...d.position, ...d.dimensions });
const zoneBox = (z: DropZone): Box => ({ ...z.shape.position, ...z.shape.dimensions });

/** Reading order: top-to-bottom rows, then left-to-right. */
const byReadingOrder = (a: Box, b: Box) => (Math.abs(a.y - b.y) > 4 ? a.y - b.y : a.x - b.x);

/**
 * True when, in reading order, the k-th tile is an answer for the k-th zone
 * for every zone — the board can be solved without reading anything.
 */
export function isGiveaway(spec: DragDropActivitySpec): boolean {
  const zones = [...spec.dropZones].sort((a, b) => byReadingOrder(zoneBox(a), zoneBox(b)));
  const tiles = [...spec.draggables].sort((a, b) => byReadingOrder(tileBox(a), tileBox(b)));
  if (zones.length < 2) return false;
  return zones.every((z, k) => !!tiles[k] && z.acceptedDraggableIds.includes(tiles[k]!.id));
}

function permuteBoxes(spec: DragDropActivitySpec, rng: Rng): DragDropActivitySpec {
  const tileBoxes = shuffleArray(spec.draggables.map(tileBox), rng);
  const zoneBoxes = shuffleArray(spec.dropZones.map(zoneBox), rng);
  return {
    ...spec,
    draggables: spec.draggables.map((d, i) => {
      const b = tileBoxes[i]!;
      return { ...d, position: { ...d.position, x: b.x, y: b.y }, dimensions: { width: b.width, height: b.height } };
    }),
    dropZones: spec.dropZones.map((z, i) => {
      const b = zoneBoxes[i]!;
      return {
        ...z,
        shape: {
          ...z.shape,
          position: { ...z.shape.position, x: b.x, y: b.y },
          dimensions: { width: b.width, height: b.height },
        },
      };
    }),
  };
}

/** A freshly shuffled copy of the board; the input is not modified. */
export function shuffleBoard(spec: DragDropActivitySpec, rng: Rng = Math.random): DragDropActivitySpec {
  // Polygon/path zones carry their own point geometry and cannot be moved by
  // swapping boxes; leave those boards as authored.
  if (spec.dropZones.some((z) => z.shape.points || z.shape.pathData)) return spec;
  let out = permuteBoxes(spec, rng);
  for (let attempt = 0; attempt < 12 && isGiveaway(out); attempt += 1) {
    out = permuteBoxes(spec, rng);
  }
  return out;
}
