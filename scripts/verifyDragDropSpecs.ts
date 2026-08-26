/**
 * Audits every shipped Match & Learn spec and fails loudly on regression.
 *
 * This exists because all nine of the defects it checks for were *already in the
 * repo* and nothing noticed: 24 boards rendered the literal string "sr label",
 * 32 gave the answer away through position, 11 clipped a target off the edge of
 * the canvas, and not one of the 43 could earn three stars on a flawless run.
 * There is no test runner in this project, so this script is the guard.
 *
 * Compile and run from the repo root:
 *
 *   rm -rf scripts/.build && \
 *   frontend/node_modules/.bin/tsc --ignoreConfig --ignoreDeprecations 6.0 \
 *     --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --strict --types node \
 *     --typeRoots ./backend/node_modules/@types --outDir scripts/.build \
 *     scripts/verifyDragDropSpecs.ts && \
 *   node scripts/.build/scripts/verifyDragDropSpecs.js
 *
 * Exits non-zero if any check fails.
 */

import * as fs from 'fs';
import * as path from 'path';

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'curriculum', 'activities', 'drag_drop_manifest.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not locate the repo root');
}

const ROOT = findRoot();
const SPEC_DIR = path.join(ROOT, 'curriculum', 'activities', 'drag_drop');

/** Must stay in step with `TILE_COLORS` in backend/src/shared/utils/drag-drop/board.ts. */
const TILE_COLORS = ['#E8386A', '#3F7FC4', '#D9741F', '#7B5BD6', '#2E8C9E', '#8A6242'];

function isCombining(code: number): boolean {
  return (
    (code >= 0x0900 && code <= 0x0903) ||
    (code >= 0x093a && code <= 0x094f) ||
    (code >= 0x0951 && code <= 0x0957) ||
    (code >= 0x0962 && code <= 0x0963) ||
    code === 0x200c ||
    code === 0x200d
  );
}

function visualLength(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (!isCombining(ch.codePointAt(0) ?? 0)) n += 1;
  }
  return Math.max(n, 1);
}

/**
 * Characters in the widest line once `text` is balanced across at most
 * `maxLines`. Must stay in step with `fitWrappedFontSize` in
 * backend/src/shared/utils/drag-drop/board.ts and with the `numberOfLines={2}`
 * that DropZone.tsx passes: a two-word zone label is deliberately sized on its
 * longest word and allowed to wrap, so measuring it as one long line would
 * report an overflow that does not happen on screen.
 *
 * The word-splitting is the same balanced chunking the builder uses, not a
 * greedy fill, so both agree on where the break lands.
 */
function wrappedVisualLength(text: string, maxLines = 2): number {
  const words = text.trim().split(/\s+/);
  if (words.length < 2 || maxLines < 2) return visualLength(text);
  const lines = Math.min(maxLines, words.length);
  const perLine = Math.ceil(words.length / lines);
  let widest = 0;
  for (let i = 0; i < words.length; i += perLine) {
    widest = Math.max(widest, visualLength(words.slice(i, i + perLine).join(' ')));
  }
  return widest;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  );
}

const failures: string[] = [];
const warnings: string[] = [];

function check(cond: boolean, file: string, message: string): void {
  if (!cond) failures.push(`${file}: ${message}`);
}

function auditFile(file: string): void {
  const spec = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, file), 'utf8')) as any;

  // ---- structure -----------------------------------------------------------
  const canvas = spec.canvas;
  check(
    Boolean(canvas?.width && canvas?.height),
    file,
    'missing canvas dimensions — the renderer divides by canvas.width to scale'
  );
  if (!canvas?.width) return;

  const tiles: any[] = Array.isArray(spec.draggables) ? spec.draggables : [];
  const zones: any[] = Array.isArray(spec.dropZones) ? spec.dropZones : [];
  check(tiles.length > 0, file, 'no draggables');
  check(zones.length > 0, file, 'no dropZones');
  if (tiles.length === 0 || zones.length === 0) return;

  // ---- content is real, not a localisation key ------------------------------
  check(
    typeof spec.metadata?.title === 'string' && !spec.metadata.title.startsWith('l10n:'),
    file,
    'metadata.title is an l10n key — DragDropRenderer replaces it with a generic fallback'
  );
  check(
    typeof spec.metadata?.description === 'string' &&
      spec.metadata.description.length > 0 &&
      !spec.metadata.description.startsWith('l10n:'),
    file,
    'metadata.description is missing or an l10n key — it is the on-screen instruction'
  );

  const texts = new Set<string>();
  tiles.forEach((t, i) => {
    check(
      typeof t.content === 'string' && t.content.trim().length > 0,
      file,
      `draggable ${i + 1} has no content — the tile renders blank or, worse, prints its own accessibility label`
    );
    const sr: string = t.accessibility?.screenReaderLabel ?? '';
    check(
      !sr.startsWith('l10n:'),
      file,
      `draggable ${i + 1} screenReaderLabel is an unresolved key ("${sr}")`
    );
    if (typeof t.content === 'string') {
      check(!texts.has(t.content), file, `duplicate tile text "${t.content}" — zone acceptance is resolved by text`);
      texts.add(t.content);
    }
  });

  // ---- geometry ------------------------------------------------------------
  const boxes: Array<{ label: string; box: Box }> = [];
  const collect = (items: any[], kind: string): void => {
    items.forEach((it, i) => {
      const pos = kind === 'zone' ? it.shape?.position : it.position;
      const dim = kind === 'zone' ? it.shape?.dimensions : it.dimensions;
      if (!pos || !dim) {
        failures.push(`${file}: ${kind} ${i + 1} has no position/dimensions`);
        return;
      }
      const box: Box = { x: pos.x, y: pos.y, width: dim.width, height: dim.height };
      check(
        box.x >= 0 && box.y >= 0 && box.x + box.width <= canvas.width && box.y + box.height <= canvas.height,
        file,
        `${kind} ${i + 1} runs outside the ${String(canvas.width)}x${String(canvas.height)} canvas ` +
          `(x ${String(box.x)}..${String(box.x + box.width)}, y ${String(box.y)}..${String(box.y + box.height)})`
      );
      boxes.push({ label: `${kind} ${i + 1}`, box });
    });
  };
  collect(zones, 'zone');
  collect(tiles, 'tile');

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a && b && overlaps(a.box, b.box)) {
        failures.push(`${file}: ${a.label} overlaps ${b.label}`);
      }
    }
  }

  // ---- text fits its box ---------------------------------------------------
  tiles.forEach((t, i) => {
    if (typeof t.content !== 'string' || !t.dimensions) return;
    const size = t.style?.fontSize ?? 56;
    const needed = visualLength(t.content) * size * 0.62;
    check(
      needed <= t.dimensions.width - 8,
      file,
      `tile ${i + 1} text "${t.content}" needs ~${String(Math.round(needed))}px at ${String(size)}px ` +
        `but its box is ${String(t.dimensions.width)}px wide`
    );
  });

  zones.forEach((z, i) => {
    const label: string = z.visualState?.targetContent ?? z.visualState?.labelText ?? '';
    check(label.length > 0, file, `zone ${i + 1} has no labelText/targetContent — it renders as a blank dashed box`);
    if (!label || !z.shape?.dimensions) return;
    const size = z.visualState?.fontSize;
    if (typeof size !== 'number') {
      warnings.push(`${file}: zone ${i + 1} has no visualState.fontSize; the renderer will measure a fallback`);
      return;
    }
    const needed = wrappedVisualLength(label) * size * 0.62;
    const lines = label.trim().split(/\s+/).length >= 2 ? 2 : 1;
    check(
      needed <= z.shape.dimensions.width - 8,
      file,
      `zone ${i + 1} label "${label}" needs ~${String(Math.round(needed))}px at ${String(size)}px ` +
        `across ${String(lines)} line(s) but its box is ${String(z.shape.dimensions.width)}px wide`
    );
    // Wrapping buys width at the cost of height; make sure the taller stack still
    // clears the box, or a two-line label is clipped instead of overflowing.
    const stack = size * 1.2 * lines;
    check(
      stack <= z.shape.dimensions.height - 8,
      file,
      `zone ${i + 1} label "${label}" stacks ${String(lines)} line(s) to ~${String(Math.round(stack))}px ` +
        `at ${String(size)}px but its box is only ${String(z.shape.dimensions.height)}px tall`
    );
  });

  // ---- acceptance ----------------------------------------------------------
  const idsInOrder: string[] = tiles.map((t) => t.id);
  const ids = new Set(idsInOrder);
  let identityMapped = true;
  zones.forEach((z, i) => {
    const accepted: string[] = Array.isArray(z.acceptedDraggableIds) ? z.acceptedDraggableIds : [];
    check(accepted.length > 0, file, `zone ${i + 1} accepts nothing — it can never be filled`);
    check(
      !accepted.includes('*'),
      file,
      `zone ${i + 1} accepts the "*" wildcard, so any drop counts as correct`
    );
    accepted.forEach((id) => {
      check(ids.has(id), file, `zone ${i + 1} accepts "${id}", which is not a draggable in this spec`);
    });
    check(z.capacity === 1, file, `zone ${i + 1} declares capacity ${String(z.capacity)}; the engine only ever stores one`);
    // Give-away check: is the tile rendered at this slot's index the one it wants?
    const here = idsInOrder[i];
    if (!here || !accepted.includes(here)) identityMapped = false;
  });
  check(
    !(identityMapped && zones.length >= 2),
    file,
    'every zone accepts exactly the tile drawn directly beneath it — the activity is solvable by dragging straight up'
  );

  // ---- colour carries no information --------------------------------------
  tiles.forEach((t, i) => {
    const expected = TILE_COLORS[i % TILE_COLORS.length];
    check(
      t.style?.backgroundColor === expected,
      file,
      `tile ${i + 1} is ${String(t.style?.backgroundColor)}, expected ${String(expected)} for its ` +
        'render position — colour must follow position, never correctness'
    );
  });

  // ---- scoring -------------------------------------------------------------
  const model = spec.validation?.scoringModel;
  if (!model) {
    failures.push(`${file}: validation.scoringModel is missing`);
  } else {
    const base: number = model.basePointsPerItem ?? 0;
    const max: number = model.maxScore ?? zones.length * base;
    const perfect = base > 0 ? (zones.length * base) / max : 0;
    const three: number = model.starThresholds?.threeStars ?? 0.9;
    check(
      perfect >= three,
      file,
      `a flawless run scores ${String(Math.round(perfect * 100))}% but three stars needs ` +
        `${String(Math.round(three * 100))}% — maxScore ${String(max)} does not match ${String(zones.length)} zones ` +
        `at ${String(base)} points`
    );
  }

  check(
    spec.validation?.strategy !== 'ordered-sequence',
    file,
    'strategy is ordered-sequence, which validates the order of placement and ignores which zone received the tile'
  );
}

function main(): void {
  const files = fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith('.json')).sort();
  files.forEach(auditFile);

  console.log(`audited ${String(files.length)} spec file(s)`);
  if (warnings.length > 0) {
    console.log(`\n${String(warnings.length)} warning(s):`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
  if (failures.length > 0) {
    console.log(`\n${String(failures.length)} FAILURE(S):`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log('all checks passed');
}

main();
