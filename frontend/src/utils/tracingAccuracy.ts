import { Point } from '../store/writeStore';
import { generatedGuidePoints } from './traceGuides';
import thresholds from './tracingThresholds.json';
import { shapeDistance, toCloud } from './shapeRecognizer';

export function getGuidePoints(guideName: string, w: number, h: number): Point[] {
  // Every letter, number and Hindi character: generated from a font
  // (traceGuides.generated.ts). The cases below are lines and shapes only.
  const generated = generatedGuidePoints(guideName, w, h);
  if (generated) return generated;

  const points: Point[] = [];
  
  const sampleLinear = (x1: number, y1: number, x2: number, y2: number, count: number) => {
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      points.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
      });
    }
  };

  switch (guideName) {
    case 'Standing Line':
      sampleLinear(w / 2, h * 0.15, w / 2, h * 0.85, 20);
      break;
    case 'Sleeping Line':
      sampleLinear(w * 0.15, h / 2, w * 0.85, h / 2, 20);
      break;
    case 'Left Slanting Line':
      sampleLinear(w * 0.75, h * 0.2, w * 0.25, h * 0.8, 20);
      break;
    case 'Right Slanting Line':
      sampleLinear(w * 0.25, h * 0.2, w * 0.75, h * 0.8, 20);
      break;
    case 'Big Curve': {
      const p0 = { x: w * 0.7, y: h * 0.2 };
      const p1 = { x: w * 0.2, y: h / 2 };
      const p2 = { x: w * 0.7, y: h * 0.8 };
      for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Small Curve': {
      const p0 = { x: w * 0.6, y: h * 0.3 };
      const p1 = { x: w * 0.3, y: h / 2 };
      const p2 = { x: w * 0.6, y: h * 0.7 };
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Semi Circle': {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const r = h * 0.3;
      for (let i = 0; i <= 18; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 18;
        points.push({
          x: cx - r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    case 'Reverse Semi Circle': {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const r = h * 0.3;
      for (let i = 0; i <= 18; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 18;
        points.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    case 'Zig-zag':
      sampleLinear(w * 0.15, h * 0.6, w * 0.325, h * 0.3, 10);
      sampleLinear(w * 0.325, h * 0.3, w * 0.5, h * 0.6, 10);
      sampleLinear(w * 0.5, h * 0.6, w * 0.675, h * 0.3, 10);
      sampleLinear(w * 0.675, h * 0.3, w * 0.85, h * 0.6, 10);
      break;
    case 'Spiral': {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.35;
      for (let i = 0; i < 72; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        const r = (maxR * i) / 72;
        points.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    case 'Loop': {
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const x = w * 0.15 + (w * 0.7) * t;
        const y = h * 0.5 + h * 0.15 * Math.sin(t * 3 * 2 * Math.PI) + h * 0.08 * Math.cos(t * 3 * 2 * Math.PI);
        points.push({ x, y });
      }
      break;
    }
    case 'Combined Curves': {
      const p0 = { x: w * 0.15, y: h * 0.5 };
      const p1 = { x: w * 0.325, y: h * 0.2 };
      const p2 = { x: w * 0.5, y: h * 0.5 };
      const p3 = { x: w * 0.675, y: h * 0.8 };
      const p4 = { x: w * 0.85, y: h * 0.5 };
      for (let i = 0; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      for (let i = 1; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p2.x + 2 * mt * t * p3.x + t * t * p4.x,
          y: mt * mt * p2.y + 2 * mt * t * p3.y + t * t * p4.y,
        });
      }
      break;
    }
    case 'Left Curve': {
      // Quadratic Bezier curve: M (w * 0.7) (h * 0.2) Q (w * 0.2) (h / 2) (w * 0.7) (h * 0.8)
      const p0 = { x: w * 0.7, y: h * 0.2 };
      const p1 = { x: w * 0.2, y: h / 2 };
      const p2 = { x: w * 0.7, y: h * 0.8 };
      for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Right Curve': {
      const p0 = { x: w * 0.3, y: h * 0.2 };
      const p1 = { x: w * 0.8, y: h / 2 };
      const p2 = { x: w * 0.3, y: h * 0.8 };
      for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      break;
    }
    case 'Zigzag Pattern':
      sampleLinear(w * 0.15, h * 0.6, w * 0.325, h * 0.3, 10);
      sampleLinear(w * 0.325, h * 0.3, w * 0.5, h * 0.6, 10);
      sampleLinear(w * 0.5, h * 0.6, w * 0.675, h * 0.3, 10);
      sampleLinear(w * 0.675, h * 0.3, w * 0.85, h * 0.6, 10);
      break;
    case 'Wave Pattern': {
      const p0 = { x: w * 0.15, y: h * 0.5 };
      const p1 = { x: w * 0.325, y: h * 0.2 };
      const p2 = { x: w * 0.5, y: h * 0.5 };
      const p3 = { x: w * 0.675, y: h * 0.8 };
      const p4 = { x: w * 0.85, y: h * 0.5 };
      for (let i = 0; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      for (let i = 1; i <= 15; i++) {
        const t = i / 15;
        const mt = 1 - t;
        points.push({
          x: mt * mt * p2.x + 2 * mt * t * p3.x + t * t * p4.x,
          y: mt * mt * p2.y + 2 * mt * t * p3.y + t * t * p4.y,
        });
      }
      break;
    }
    case 'Triangle':
      sampleLinear(w / 2, h * 0.2, w * 0.8, h * 0.8, 15);
      sampleLinear(w * 0.8, h * 0.8, w * 0.2, h * 0.8, 15);
      sampleLinear(w * 0.2, h * 0.8, w / 2, h * 0.2, 15);
      break;
    case 'Square':
      sampleLinear(w * 0.2, h * 0.2, w * 0.8, h * 0.2, 12);
      sampleLinear(w * 0.8, h * 0.2, w * 0.8, h * 0.8, 12);
      sampleLinear(w * 0.8, h * 0.8, w * 0.2, h * 0.8, 12);
      sampleLinear(w * 0.2, h * 0.8, w * 0.2, h * 0.2, 12);
      break;
    case 'Rectangle':
      sampleLinear(w * 0.15, h * 0.25, w * 0.85, h * 0.25, 14);
      sampleLinear(w * 0.85, h * 0.25, w * 0.85, h * 0.75, 12);
      sampleLinear(w * 0.85, h * 0.75, w * 0.15, h * 0.75, 14);
      sampleLinear(w * 0.15, h * 0.75, w * 0.15, h * 0.25, 12);
      break;
    case 'Oval': {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.35;
      const ry = h * 0.25;
      for (let i = 0; i < 36; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        points.push({
          x: cx + rx * Math.cos(angle),
          y: cy + ry * Math.sin(angle),
        });
      }
      break;
    }
    case 'Star': {
      const cx = w / 2;
      const cy = h / 2;
      const outerR = Math.min(w, h) * 0.35;
      const innerR = outerR * 0.4;
      const vertices: Point[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        vertices.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      for (let i = 0; i < 10; i++) {
        const next = (i + 1) % 10;
        sampleLinear(vertices[i].x, vertices[i].y, vertices[next].x, vertices[next].y, 6);
      }
      break;
    }
    case 'Heart': {
      const sampleCubic = (p0: Point, p1: Point, p2: Point, p3: Point, count: number) => {
        for (let i = 0; i <= count; i++) {
          const t = i / count;
          const mt = 1 - t;
          points.push({
            x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
            y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
          });
        }
      };
      const start = { x: w / 2, y: h * 0.3 };
      const bottom = { x: w / 2, y: h * 0.85 };
      const l1 = { x: w * 0.2, y: h * 0.1 };
      const l2 = { x: w * 0.1, y: h * 0.55 };
      const r1 = { x: w * 0.8, y: h * 0.1 };
      const r2 = { x: w * 0.9, y: h * 0.55 };
      sampleCubic(start, l1, l2, bottom, 20);
      sampleCubic(bottom, r2, r1, start, 20);
      break;
    }
    case 'Diamond':
      sampleLinear(w / 2, h * 0.2, w * 0.8, h / 2, 12);
      sampleLinear(w * 0.8, h / 2, w / 2, h * 0.8, 12);
      sampleLinear(w / 2, h * 0.8, w * 0.2, h / 2, 12);
      sampleLinear(w * 0.2, h / 2, w / 2, h * 0.2, 12);
      break;
    case 'Pentagon': {
      const cx = w / 2;
      const cy = h / 2 + 10;
      const r = Math.min(w, h) * 0.32;
      const vertices: Point[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        vertices.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5;
        sampleLinear(vertices[i].x, vertices[i].y, vertices[next].x, vertices[next].y, 10);
      }
      break;
    }
    case 'Hexagon': {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.32;
      const vertices: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        vertices.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        sampleLinear(vertices[i].x, vertices[i].y, vertices[next].x, vertices[next].y, 10);
      }
      break;
    }
    case 'Circle': {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.3;
      for (let i = 0; i < 36; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        points.push({
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        });
      }
      break;
    }
    // === LETTER GUIDES A-Z ===
    // Slanting Line alias (used when lesson title is just "Slanting Line")
    case 'Slanting Line':
      sampleLinear(w * 0.25, h * 0.2, w * 0.75, h * 0.8, 20);
      break;
    default:
      // Square fallback
      sampleLinear(w * 0.2, h * 0.2, w * 0.8, h * 0.2, 10);
      sampleLinear(w * 0.8, h * 0.2, w * 0.8, h * 0.8, 10);
      sampleLinear(w * 0.8, h * 0.8, w * 0.2, h * 0.8, 10);
      sampleLinear(w * 0.2, h * 0.8, w * 0.2, h * 0.2, 10);
      break;
  }
  return points;
}

/** Tuning, shared by every character: see tracingThresholds.json. */
export const TRACING = thresholds as {
  reachFraction: number;
  coverageFade: number;
  precisionFade: number;
  presenceReaches: number;
  presenceWeight: number;
  maxInkRatio: number;
  strokeBreakFactor: number;
  passRaw: number;
  honesty: number;
  shapePoints: number;
  shapeGoodDistance: number;
  shapeBadDistance: number;
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Splits a guide's flattened points back into strokes: a jump much larger
 * than the usual spacing between points is a pen lift.
 */
export function guideStrokes(points: Point[]): Point[][] {
  if (points.length === 0) return [];
  const gaps = points.slice(1).map((p, i) => dist(p, points[i]));
  const usual = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 1;
  const out: Point[][] = [[points[0]]];
  points.slice(1).forEach((p, i) => {
    if (gaps[i] > usual * TRACING.strokeBreakFactor) out.push([p]);
    else out[out.length - 1].push(p);
  });
  return out;
}

/**
 * Length of a set of strokes, measured between points at least `step` apart,
 * so a finger's small jitter is not mistaken for extra ink.
 */
const pathLength = (strokes: Point[][], step: number) =>
  strokes.reduce((sum, s) => {
    let last = s[0];
    let len = 0;
    for (const p of s) {
      const d = dist(p, last);
      if (d >= step) {
        len += d;
        last = p;
      }
    }
    return sum + len;
  }, 0);

/**
 * Placement: how well the ink sits on the dotted guide, 0-100. One rule for every letter,
 * number and Hindi character; its numbers live in tracingThresholds.json.
 *
 *  - **presence**: how much of the character has any ink within a few
 *    reaches, i.e. was attempted at all. Raised to a power, so leaving a part
 *    out costs far more than drawing it loosely.
 *  - **coverage**: how closely the guide is covered.
 *  - **precision**: how much of the ink is near the guide.
 *  - **extra ink**: ink much longer than the guide itself (scribbling over
 *    the board) scales the score down.
 *
 * Distances are measured against the character's own size (its height, or
 * half its width for a flat shape), not the board's: a letter inside a word
 * is small, and a board-sized tolerance would let ink on its neighbour count.
 * Credit fades with distance rather than stopping at a cut-off, which leaves a
 * young child room to wobble: strokes in roughly the right place but offset
 * still score, while half a character or a scribble does not. Tested across
 * every traceable character in __tests__/tracingAccuracy.test.ts.
 */
export function calculateTracingAccuracy(strokes: Point[][], guidePoints: Point[]): number {
  if (strokes.length === 0 || guidePoints.length === 0) return 0;

  const userPoints = strokes.flat();
  if (userPoints.length === 0) return 0;

  const xs = guidePoints.map((p) => p.x);
  const ys = guidePoints.map((p) => p.y);
  const size = Math.max(Math.max(...ys) - Math.min(...ys), (Math.max(...xs) - Math.min(...xs)) / 2, 1);
  const reach = size * TRACING.reachFraction;
  const credit = (d: number, fade: number) => Math.max(0, Math.min(1, (reach * fade - d) / (reach * (fade - 1))));

  const nearest = (p: Point, pts: Point[]) => {
    let best = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - p.x;
      const dy = pts[i].y - p.y;
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };

  const guideGaps = guidePoints.map((g) => nearest(g, userPoints));
  const presence = guideGaps.filter((d) => d <= reach * TRACING.presenceReaches).length / guideGaps.length;
  const coverage = guideGaps.reduce((s, d) => s + credit(d, TRACING.coverageFade), 0) / guideGaps.length;
  const precision =
    userPoints.reduce((s, u) => s + credit(nearest(u, guidePoints), TRACING.precisionFade), 0) / userPoints.length;

  const step = reach / 2;
  const inkRatio = pathLength(strokes, step) / Math.max(1, pathLength(guideStrokes(guidePoints), step));
  const extraInk = inkRatio > TRACING.maxInkRatio ? TRACING.maxInkRatio / inkRatio : 1;

  return Math.round(Math.pow(presence, TRACING.presenceWeight) * coverage * precision * extraInk * 100);
}

/**
 * Shape: does what the child drew look like the character? 0-1.
 *
 * Placement alone only asks whether ink lies near the dotted outline, so a C
 * drawn inside a G's outline scored 89%. Here the drawing and the guide are
 * compared as shapes, with position and size factored out
 * (utils/shapeRecognizer.ts), so a missing crossbar or an unclosed loop costs
 * whatever part of the board it was drawn on.
 */
export function shapeScore(strokes: Point[][], guidePoints: Point[]): number {
  if (strokes.flat().length === 0 || guidePoints.length === 0) return 0;
  const n = TRACING.shapePoints;
  const d = shapeDistance(toCloud(strokes, n), toCloud(guideStrokes(guidePoints), n));
  const { shapeGoodDistance: good, shapeBadDistance: bad } = TRACING;
  return Math.max(0, Math.min(1, (bad - d) / (bad - good)));
}

/**
 * The tracing score, 0-100: placement (on the guide) x shape (looks like the
 * character). Both must be good — a neat C on a G guide fails on shape, a
 * perfect G drawn in a corner fails on placement.
 */
export function scoreTrace(strokes: Point[][], guidePoints: Point[]): number {
  return Math.round(calculateTracingAccuracy(strokes, guidePoints) * shapeScore(strokes, guidePoints));
}

export function getStarsFromScore(score: number): number {
  if (score >= 80) return 3;
  if (score >= 60) return 2;
  if (score >= 40) return 1;
  return 0;
}
