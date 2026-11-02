/**
 * Tracing guides for characters: which guide an item uses, and the generated
 * guides' geometry on the board.
 *
 * Every letter (capital and small), number, number name and Hindi character
 * is a guide generated from a font (TRACE_GUIDES; see
 * scripts/trace-guides/README.md), so they are all made the same way. Names:
 * `Trace <item>` for revision items, and the older `Letter X` / `Number 7`
 * that single-letter lessons use resolve to the same guides. Lines and shapes
 * ("Standing Line", "Circle"…) stay drawn in tracingAccuracy.ts.
 */
import { TRACE_GUIDES } from './traceGuides.generated';

export interface GuidePoint {
  x: number;
  y: number;
}

const PREFIX = 'Trace ';

/** The guide name for one revision item. */
export function guideNameForItem(item: string): string {
  return `${PREFIX}${item}`;
}

/** The generated guide a guide name refers to, if any. */
function guideKeyOf(guideName: string): string | null {
  if (guideName.startsWith(PREFIX)) return guideName.slice(PREFIX.length);
  const letter = /^Letter ([A-Za-z])$/.exec(guideName);
  if (letter) return letter[1];
  const number = /^Number (\d+)$/.exec(guideName);
  if (number) return number[1];
  return null;
}

/** True when the app can draw a guide for this item. */
export function hasGuideForItem(item: string): boolean {
  return Object.prototype.hasOwnProperty.call(TRACE_GUIDES, item);
}

/**
 * A generated guide's strokes fitted to a w x h board: uniformly scaled into
 * the middle of the board (the hand-drawn guides use about the same area), so
 * a word fills the width and a letter the height without distortion.
 */
export function generatedGuideStrokes(guideName: string, w: number, h: number): GuidePoint[][] | null {
  const key = guideKeyOf(guideName);
  const g = key === null ? undefined : TRACE_GUIDES[key];
  if (!g) return null;
  const boxW = w * 0.84;
  const boxH = h * 0.7;
  const scale = Math.min(boxW / g.w, boxH / g.h);
  const dx = (w - g.w * scale) / 2;
  const dy = (h - g.h * scale) / 2;
  return g.s.map((flat) => {
    const pts: GuidePoint[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) pts.push({ x: dx + flat[i] * scale, y: dy + flat[i + 1] * scale });
    return pts;
  });
}

/**
 * Points along a generated guide for scoring, evenly spaced so a long stroke
 * weighs more than a short one (like the hand-drawn guides' sampling).
 */
export function generatedGuidePoints(guideName: string, w: number, h: number): GuidePoint[] | null {
  const strokes = generatedGuideStrokes(guideName, w, h);
  if (!strokes) return null;
  const spacing = Math.max(4, Math.min(w, h) * 0.025);
  const out: GuidePoint[] = [];
  for (const stroke of strokes) {
    out.push(stroke[0]);
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1];
      const b = stroke[i];
      const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / spacing));
      for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
  }
  return out;
}

/** SVG path data for a generated guide: one subpath per stroke. */
export function generatedGuidePath(guideName: string, w: number, h: number): { d: string; paths: string[] } | null {
  const strokes = generatedGuideStrokes(guideName, w, h);
  if (!strokes) return null;
  const paths = strokes.map((s) => s.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
  return { d: paths.join(' '), paths };
}

/** What to call an item on screen: "Trace क" reads as the item itself. */
export function labelForGuide(guideName: string): string {
  return guideName.startsWith(PREFIX) ? guideName.slice(PREFIX.length) : guideName;
}
