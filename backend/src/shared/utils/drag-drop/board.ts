/**
 * Match & Learn board builder — PetalPath Drag & Drop generation
 *
 * This module turns a small, human-authorable `Blueprint` ("here are the slots,
 * here is what belongs in each") into a full v2.1.0 `DragDropActivitySpec`. It
 * exists because the previous generator hardcoded geometry, colour and scoring,
 * and every one of those hardcodes was wrong:
 *
 *  - Colour encoded the answer. The correct tile was `#4A90E2` and every
 *    distractor `#8B5CF6`, so a child learned "pick the blue one" instead of the
 *    lesson. Here colour is assigned by *rendered index* after the shuffle, so it
 *    is mathematically incapable of correlating with correctness.
 *  - Position encoded the answer. The correct tile was always `x: 100` — the
 *    leftmost — and slots ran left-to-right in the same order as the tiles, so
 *    the whole activity was "drag straight up". Here the tile order is a seeded
 *    shuffle, and a permutation that happens to reproduce the slot order is
 *    rejected and reshuffled.
 *  - Three stars were unreachable. `maxScore` was a flat 100 while a board has
 *    only 3-4 slots worth 10 points each, so a *flawless* run scored 30% and
 *    earned zero stars. Here `maxScore` is derived from the slot count.
 *  - Text overflowed its tile. A 56px glyph in a 140px box is fine for "A" and
 *    ruinous for "Elephant". Here every tile gets a measured `fontSize`.
 *
 * The seed is the node id, so a child who retries a lesson sees the same board
 * in the same place — the shuffle is unpredictable to the author, not unstable
 * for the learner.
 */

/** A single target on the board. One slot holds exactly one tile — see NOTE. */
export interface BlueprintSlot {
  /**
   * The ghost text drawn inside the empty target. Keep it short: the renderer
   * draws it large, and although we now emit a measured `fontSize` alongside it,
   * a long label still competes with the tiles for space.
   */
  label: string;
  /**
   * Tile texts that are correct here. More than one makes the slot accept any of
   * a set (e.g. a "Flies" slot accepting either bird), which is how we express
   * categories despite the one-tile-per-slot limit.
   */
  accepts: string[];
  /** Spoken description. Defaults to a sentence built from `label`. */
  sr?: string;
}

export interface Blueprint {
  /** Recorded in `metadata.templateRef` and the tag list. Descriptive only. */
  templateId: string;
  /**
   * The on-screen instruction. Goes to `metadata.description`, which
   * `DragDropRenderer` renders at `numberOfLines={2}` — so keep it to one short
   * sentence, phrased to the child.
   */
  prompt: string;
  slots: BlueprintSlot[];
  /** Extra tiles that belong in no slot. Optional, and safe: see NOTE. */
  distractors?: string[];
  /** Board heading. Defaults to the lesson title passed to `buildSpec`. */
  title?: string;
  /** BCP-47 tag for the tile text, e.g. `hi-IN` for Devanagari. */
  language?: string;
}

/*
 * NOTE — the engine constraint that shapes every blueprint.
 *
 * `PlacementState` stores placements as `Map<zoneId, draggableId>`: one tile per
 * zone, and a second drop on the same zone *overwrites* the first. So a literal
 * "sort six things into three bins" board is impossible without an engine
 * change. Every blueprint is therefore a bijection — one correct tile per slot —
 * and a category board is expressed as several slots of the same category, or as
 * one slot per category with a set of interchangeable `accepts`.
 *
 * Distractors are safe for *completion* (`evaluateOverallCompletion` only
 * requires every zone filled and every placement accepted) but they inflate
 * `draggables.length`, which `DragDropEngine.finishActivity()` passes as
 * `totalItems` to the scorer. That is exactly why `maxScore` below is derived
 * from the slot count and not from the tile count.
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/**
 * Tile colours. Every one of these clears 3:1 against white, which the six in
 * `Draggable.tsx`'s fallback palette do not — `orange #EE8C3C` measures 2.48,
 * `leafGreen #6FA85B` 2.83 and `coral #F4776E` 2.72, all below the large-text
 * bar despite a comment in that file claiming otherwise.
 *
 * None of them is the green or the red that `DropZone` uses for correct/incorrect
 * feedback, so a tile can never be mistaken for a verdict.
 */
export const TILE_COLORS = [
  '#E8386A', // rose   4.03:1
  '#3F7FC4', // blue   4.16:1
  '#D9741F', // amber  3.25:1
  '#7B5BD6', // purple 4.87:1
  '#2E8C9E', // teal   3.92:1
  '#8A6242', // cocoa  5.38:1
] as const;

// ---------------------------------------------------------------------------
// Deterministic shuffle
// ---------------------------------------------------------------------------

/** FNV-1a, 32-bit. Small, dependency-free, and good enough to seed a PRNG. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32. Deterministic, uniform enough for laying out six tiles. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Text measurement
// ---------------------------------------------------------------------------

/**
 * Devanagari combining marks — matras, virama, nukta, anusvara and friends. They
 * stack onto the preceding consonant rather than advancing the pen, so counting
 * them as characters makes "का" look twice as wide as it draws and shrinks the
 * text needlessly. U+0950 (ॐ) is deliberately excluded: it is a full glyph.
 */
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

/** Advance width of `text`, in "one average glyph" units. */
export function visualLength(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (!isCombining(ch.codePointAt(0) ?? 0)) n += 1;
  }
  return Math.max(n, 1);
}

/**
 * Largest font size at which `text` fits a `w` x `h` box.
 *
 * `0.62` is the average advance-to-size ratio of the app's rounded face for
 * mixed-case Latin; `1.2` is its line height. Both are approximations, which is
 * why the result is deliberately conservative — 24px of horizontal padding for a
 * box whose real padding is 8.
 */
export function fitFontSize(text: string, w: number, h: number, cap = 72): number {
  const len = visualLength(text);
  const byWidth = (w - 24) / (len * 0.62);
  const byHeight = (h - 24) / 1.2;
  return Math.max(18, Math.min(cap, Math.round(Math.min(byWidth, byHeight))));
}

/**
 * Like `fitFontSize`, but allows a multi-word label to wrap onto `maxLines`.
 *
 * Sizing a two-word label as one long line is what crushed the worst offender:
 * "Not Helping" is 11 characters, so it fitted a 220px target only at 29px —
 * roughly 14 physical pixels once the board's ~0.5 scale is applied, which is not
 * a readable size for a five-year-old. Wrapping lets the width constraint come
 * from the longest *word* ("Helping", 7 characters) instead, which lifts the same
 * label to 45px. The height constraint tightens in proportion, so a label only
 * wraps when that trade actually wins.
 *
 * The renderer must agree about the line budget — `DropZone` passes
 * `numberOfLines={2}` for exactly this reason.
 */
export function fitWrappedFontSize(text: string, w: number, h: number, maxLines = 2, cap = 72): number {
  const single = fitFontSize(text, w, h, cap);

  const words = text.trim().split(/\s+/);
  if (words.length < 2 || maxLines < 2) return single;

  // Balance the words across the available lines, then constrain on the widest
  // resulting line rather than on the whole string.
  const lines = Math.min(maxLines, words.length);
  const perLine = Math.ceil(words.length / lines);
  let widest = 0;
  for (let i = 0; i < words.length; i += perLine) {
    const chunk = words.slice(i, i + perLine).join(' ');
    widest = Math.max(widest, visualLength(chunk));
  }

  const byWidth = (w - 24) / (widest * 0.62);
  const byHeight = (h - 24) / (1.2 * lines);
  const wrapped = Math.max(18, Math.min(cap, Math.round(Math.min(byWidth, byHeight))));

  return Math.max(single, wrapped);
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/*
 * The canvas is PORTRAIT, and that is the single biggest layout decision here.
 *
 * It used to be 1000x750 landscape. `Canvas.tsx` letterboxes the board to fit
 * while preserving aspect ratio, and the stage it fits into is a portrait column
 * — the window minus header, instruction and footer. Measured against the fit
 * maths in that file, a 4:3 board on a portrait phone lands like this:
 *
 *   phone 360x640 → stage 360x390 → board 360x270, scale 0.36, 69% of the stage
 *   phone 393x730 → stage 393x480 → board 393x295, scale 0.39, 61% of the stage
 *   phone 412x824 → stage 412x574 → board 412x309, scale 0.41, 54% of the stage
 *
 * So a third to a half of the play area was empty letterbox, and because every
 * emitted `fontSize` is multiplied by that scale, a 35px tile glyph reached the
 * child at 14 physical pixels. Matching the board's aspect to the stage's fixes
 * both at once — same numbers, 760x980:
 *
 *   phone 360x640 → board 302x390, scale 0.40, 84% of the stage
 *   phone 393x730 → board 372x480, scale 0.49, 95% of the stage
 *   phone 412x824 → board 412x531, scale 0.54, 93% of the stage
 *
 * Nothing in the app reads `canvas.orientation`; the fit is derived purely from
 * width/height, so this is a pure data change with no renderer counterpart.
 */
const CANVAS = { width: 760, height: 980 } as const;
const MARGIN_X = 30;
const USABLE = CANVAS.width - MARGIN_X * 2; // 700

/**
 * Three across is the ceiling. A portrait board is narrow, so a fourth box in the
 * row costs more in width — and therefore in font size — than a second row costs
 * in height, and we have height to spare.
 */
const MAX_PER_ROW = 3;

const SLOT_H = 170;
const TILE_H = 150;
const SLOT_GAP_Y = 24;
const TILE_GAP_Y = 22;
/** Clear air between the targets above and the tray of tiles below. */
const BAND_GAP = 64;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Lays `count` equal boxes in one centred row, never exceeding the margins. */
function centredRow(count: number, preferredW: number, h: number, y: number, gap: number): Box[] {
  const maxW = Math.floor((USABLE - (count - 1) * gap) / count);
  const w = Math.max(60, Math.min(preferredW, maxW));
  const total = count * w + (count - 1) * gap;
  const startX = MARGIN_X + Math.round((USABLE - total) / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * (w + gap),
    y,
    width: w,
    height: h,
  }));
}

/**
 * Wraps `count` boxes into centred rows of at most `perRow`, balancing the rows
 * rather than filling greedily — four boxes become 2+2, not 3+1, because a lone
 * box on the second row reads as a mistake.
 */
function gridRows(
  count: number,
  perRow: number,
  preferredW: number,
  h: number,
  startY: number,
  gapX: number,
  gapY: number
): Box[] {
  const rowCount = Math.max(1, Math.ceil(count / perRow));
  const base = Math.floor(count / rowCount);
  let extra = count % rowCount;

  const out: Box[] = [];
  let y = startY;
  for (let r = 0; r < rowCount; r += 1) {
    const n = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    out.push(...centredRow(n, preferredW, h, y, gapX));
    y += h + gapY;
  }
  return out;
}

/**
 * Places the targets and the tiles as two stacked, vertically centred bands.
 *
 * Centring the whole composition matters because the band heights vary with the
 * board: three targets and four tiles occupy far less than five and six. Pinning
 * the first row to a fixed `y` — which the old generator did — left a short board
 * hugging the top with a gulf beneath it.
 */
function planBoard(slotCount: number, tileCount: number): { slots: Box[]; tiles: Box[] } {
  const slotRows = Math.max(1, Math.ceil(slotCount / MAX_PER_ROW));
  const tileRows = Math.max(1, Math.ceil(tileCount / MAX_PER_ROW));

  const slotBlockH = slotRows * SLOT_H + (slotRows - 1) * SLOT_GAP_Y;
  const tileBlockH = tileRows * TILE_H + (tileRows - 1) * TILE_GAP_Y;
  const totalH = slotBlockH + BAND_GAP + tileBlockH;

  const startY = Math.max(28, Math.round((CANVAS.height - totalH) / 2));

  return {
    slots: gridRows(slotCount, MAX_PER_ROW, 220, SLOT_H, startY, 26, SLOT_GAP_Y),
    tiles: gridRows(
      tileCount,
      MAX_PER_ROW,
      200,
      TILE_H,
      startY + slotBlockH + BAND_GAP,
      24,
      TILE_GAP_Y
    ),
  };
}

// ---------------------------------------------------------------------------
// Spec assembly
// ---------------------------------------------------------------------------

interface PlannedTile {
  text: string;
  /** Index of the slot this tile answers, or -1 for a distractor. */
  slot: number;
}

/**
 * True when the shuffle happened to leave every tile sitting directly under the
 * slot it answers — the "drag straight up" board we are trying to eliminate.
 */
function isGiveaway(tiles: readonly PlannedTile[], slotCount: number): boolean {
  if (slotCount < 2) return false;
  for (let i = 0; i < slotCount; i += 1) {
    const tile = tiles[i];
    if (!tile || tile.slot !== i) return false;
  }
  return true;
}

export interface BuildOptions {
  /** Overrides `curriculumRef.activityIndex`. Defaults to 3. */
  activityIndex?: number;
  /** Frozen timestamp, so regenerating twice produces identical files. */
  generatedAt?: string;
}

export function buildSpec(
  nodeId: string,
  lessonTitle: string,
  bp: Blueprint,
  opts: BuildOptions = {}
): Record<string, unknown> {
  if (bp.slots.length === 0) {
    throw new Error(`Blueprint for ${nodeId} has no slots`);
  }

  // --- Collect the tiles ---------------------------------------------------
  // One tile per accepted text, plus distractors. Texts are deduplicated because
  // a zone's `acceptedDraggableIds` is resolved by text, so a repeated text would
  // be ambiguous — and two identical tiles is a confusing board anyway.
  const seen = new Set<string>();
  const planned: PlannedTile[] = [];

  bp.slots.forEach((slot, slotIndex) => {
    if (slot.accepts.length === 0) {
      throw new Error(`Slot "${slot.label}" in ${nodeId} accepts nothing`);
    }
    for (const text of slot.accepts) {
      const key = text.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      planned.push({ text: key, slot: slotIndex });
    }
  });

  for (const text of bp.distractors ?? []) {
    const key = text.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    planned.push({ text: key, slot: -1 });
  }

  // --- Shuffle, rejecting the give-away permutation ------------------------
  const baseSeed = fnv1a(nodeId);
  let tiles = shuffled(planned, mulberry32(baseSeed));
  for (let attempt = 1; attempt <= 12 && isGiveaway(tiles, bp.slots.length); attempt += 1) {
    tiles = shuffled(planned, mulberry32((baseSeed + attempt * 0x9e3779b9) >>> 0));
  }

  // --- Geometry and type ---------------------------------------------------
  const { slots: slotBoxes, tiles: tileBoxes } = planBoard(bp.slots.length, tiles.length);

  // One size for the whole board, driven by its longest label against the
  // *narrowest* box: rows can differ in how many boxes they hold (five tiles wrap
  // to 3+2), so sizing off `boxes[0]` alone would overflow the tighter row.
  const narrowestTile = tileBoxes.reduce((m, b) => Math.min(m, b.width), Infinity);
  const longestTile = tiles.reduce((a, b) => (visualLength(b.text) > visualLength(a) ? b.text : a), '');
  const tileFontSize = fitFontSize(longestTile, narrowestTile, TILE_H);

  const narrowestSlot = slotBoxes.reduce((m, b) => Math.min(m, b.width), Infinity);
  const longestSlot = bp.slots.reduce((a, s) => (visualLength(s.label) > visualLength(a) ? s.label : a), '');
  // Zone labels may wrap to two lines; tile texts are single words and do not.
  const slotFontSize = fitWrappedFontSize(longestSlot, narrowestSlot, SLOT_H, 2);

  // --- Draggables ---------------------------------------------------------
  const idByText = new Map<string, string>();
  const draggables = tiles.map((tile, i) => {
    const id = `drag-item-${i + 1}`;
    idByText.set(tile.text, id);
    const box = tileBoxes[i] as Box;
    return {
      id,
      contentType: 'text',
      content: tile.text,
      contentLocalizationKey: null,
      position: { x: box.x, y: box.y },
      dimensions: { width: box.width, height: box.height },
      style: {
        // Colour by rendered index, so it tracks position on screen and not the
        // answer key. Deliberately not `tile.slot`.
        backgroundColor: TILE_COLORS[i % TILE_COLORS.length],
        borderRadius: 24,
        textColor: '#FFFFFF',
        fontSize: tileFontSize,
        fontWeight: '800',
      },
      behavior: { draggable: true, returnToOriginOnFailure: true, lockAfterCorrectDrop: true },
      accessibility: {
        screenReaderLabel: tile.text,
        hintText: 'Drag this onto the box it belongs in',
      },
      sortOrder: i + 1,
    };
  });

  // --- Drop zones ---------------------------------------------------------
  const dropZones = bp.slots.map((slot, i) => {
    const box = slotBoxes[i] as Box;
    const accepted = slot.accepts
      .map((t) => idByText.get(t.trim()))
      .filter((id): id is string => Boolean(id));
    if (accepted.length === 0) {
      throw new Error(`Slot "${slot.label}" in ${nodeId} resolved to no tiles`);
    }
    return {
      id: `zone-target-${i + 1}`,
      shape: {
        type: 'rectangle',
        position: { x: box.x, y: box.y },
        dimensions: { width: box.width, height: box.height },
      },
      acceptedDraggableIds: accepted,
      capacity: 1,
      visualState: {
        defaultAppearance: 'visible',
        hoverHighlight: 'glow',
        correctHighlight: 'glow-green',
        incorrectHighlight: 'shake',
        labelText: slot.label,
        targetContent: slot.label,
        // Additive field: `DropZone` hardcodes 72px, which overflows any label
        // longer than about three characters. It prefers this when present.
        fontSize: slotFontSize,
      },
      snapping: { enabled: true, snapAlignment: 'center' },
      sortOrder: i + 1,
      accessibility: {
        screenReaderLabel: slot.sr ?? `Box for ${slot.label}`,
        dropHintText: `Drop the matching piece into ${slot.label}`,
      },
    };
  });

  const basePointsPerItem = 10;
  const title = bp.title ?? lessonTitle;

  return {
    $schema: 'https://petalpath.io/schemas/drag-drop-activity/v2.1.0',
    id: `petalpath:activity:generated:${nodeId}`,
    schemaVersion: '2.1.0',
    engine: {
      engineId: 'petalpath:engine:drag-drop',
      targetEngineVersion: '1.4.0',
      minimumEngineVersion: '1.0.0',
      requiredCapabilities: ['drag-and-drop', 'snap-to-target'],
    },
    curriculumRef: {
      nodeId,
      activityIndex: opts.activityIndex ?? 3,
      activityType: 'drag_drop',
    },
    metadata: {
      // Plain text, never an `l10n:` key: `DragDropRenderer` checks for the
      // prefix and silently swaps in a generic fallback title if it finds one.
      title,
      description: bp.prompt,
      templateRef: { templateId: bp.templateId, templateVersion: '2.0.0' },
      primaryLanguage: bp.language ?? 'en-IN',
      supportedLanguages: [bp.language ?? 'en-IN'],
      tags: [bp.templateId, 'drag-and-drop'],
      status: 'published',
      generatedAt: opts.generatedAt ?? new Date().toISOString(),
    },
    canvas: { width: CANVAS.width, height: CANVAS.height, orientation: 'portrait' },
    draggables,
    dropZones,
    validation: {
      // `one-to-one`, never `ordered-sequence`: the latter validates against
      // `orderedSequence[placedCount]` and ignores *which* zone received the
      // tile, so filling the second slot first is scored as a mistake.
      strategy: 'one-to-one',
      evaluationTiming: 'on-drop',
      allowRetries: true,
      maxAttempts: 0,
      scoringModel: {
        type: 'per-item',
        basePointsPerItem,
        // Derived from the slots, not fixed at 100 and not taken from the tile
        // count. A flawless run must score 1.0, or the star thresholds below are
        // unreachable and distractors quietly penalise the child.
        maxScore: bp.slots.length * basePointsPerItem,
        starThresholds: { oneStar: 0.4, twoStars: 0.7, threeStars: 0.9 },
      },
    },
    interaction: {
      snapping: { preset: 'easy', snapRadius: 100, magneticAttraction: 0.7 },
      dragBehavior: { touchMode: 'offset', dragFeedback: 'both', dragScaleFactor: 1.1 },
      inputModes: { touch: true, mouse: true, keyboard: true },
    },
    animations: {
      onActivityStart: { itemRevealStyle: 'cascade', revealDelayMs: 200 },
      onCorrectDrop: { effects: [{ type: 'sparkle', durationMs: 800 }] },
      onIncorrectDrop: { effects: [{ type: 'gentle-return', durationMs: 500 }] },
      onActivityComplete: { effects: [{ type: 'confetti', durationMs: 2000 }] },
    },
    hints: {
      enabled: true,
      progressiveHints: [
        { level: 1, triggerAfterAttempts: 2, hintType: 'highlight-target', durationMs: 3000 },
      ],
      idleHint: { enabled: true, idleTimeoutMs: 8000, hintType: 'pulse-draggable' },
    },
    accessibility: {
      screenReader: { enabled: true, announceDrops: true, announceErrors: true },
      narration: { enabled: true, autoPlayOnLoad: false },
      visual: { colorBlindSafe: true },
    },
    localization: {
      keyNamespace: `l10n:drag:${nodeId}`,
      fallbackLanguage: 'en-IN',
      stringKeys: {},
      textDirection: 'ltr',
    },
    assets: { required: [], optional: [], preloadStrategy: 'immediate' },
    completionSignals: {
      signals: [
        { signalId: 'activity.completed', condition: 'always', description: 'Emitted on completion' },
        {
          signalId: 'activity.threeStars',
          condition: 'score-gte:starThresholds.threeStars',
          description: 'Three stars',
        },
      ],
    },
  };
}
