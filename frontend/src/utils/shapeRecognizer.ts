/**
 * What did the child draw? A point-cloud shape recogniser ($P: Vatavu, Anthony
 * & Wobbrock, "Gestures as Point Clouds", ICMI 2012).
 *
 * Both the drawing and each character's guide become a cloud of evenly spaced
 * points, scaled to the same size and centred, so where on the board and how
 * big the child drew no longer matter — only the shape. Stroke order and
 * direction are ignored, which suits children: they rarely draw a letter in
 * the textbook order. Two clouds are compared by greedily pairing each point
 * with its nearest unpaired partner; a small total distance means the same
 * shape.
 *
 * Used by the tracing scorer to (1) check the drawing looks like the target
 * character more than like the other characters of its kind, and (2) grade
 * how well its shape matches. Pure: no React Native.
 */

export interface CloudPoint {
  x: number;
  y: number;
}

const dist = (a: CloudPoint, b: CloudPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** `n` points evenly spaced along the strokes (pen lifts are not bridged). */
export function resampleStrokes(strokes: CloudPoint[][], n: number): CloudPoint[] {
  const usable = strokes.filter((s) => s.length > 0);
  const lengths = usable.map((s) => s.slice(1).reduce((t, p, i) => t + dist(p, s[i]), 0));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (usable.length === 0) return [];
  if (total === 0) return Array.from({ length: n }, () => ({ ...usable[0][0] }));

  const step = total / (n - 1);
  const out: CloudPoint[] = [{ ...usable[0][0] }];
  let carried = 0;
  for (const s of usable) {
    for (let i = 1; i < s.length; i++) {
      let a = s[i - 1];
      const b = s[i];
      let seg = dist(a, b);
      while (carried + seg >= step && out.length < n) {
        const t = (step - carried) / seg;
        const q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        out.push(q);
        a = q;
        seg = dist(a, b);
        carried = 0;
      }
      carried += seg;
    }
  }
  const last = usable[usable.length - 1];
  while (out.length < n) out.push({ ...last[last.length - 1] });
  return out;
}

/** Scaled so the larger side is 1, keeping the aspect ratio, and centred on the origin. */
export function normaliseCloud(points: CloudPoint[]): CloudPoint[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const scale = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const cx = xs.reduce((a, b) => a + b, 0) / points.length;
  const cy = ys.reduce((a, b) => a + b, 0) / points.length;
  return points.map((p) => ({ x: (p.x - cx) / scale, y: (p.y - cy) / scale }));
}

/** A drawing or guide, ready to compare. */
export function toCloud(strokes: CloudPoint[][], n: number): CloudPoint[] {
  return normaliseCloud(resampleStrokes(strokes, n));
}

function cloudDistance(a: CloudPoint[], b: CloudPoint[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let best = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = dist(a[i], b[j]);
      if (d < best) {
        best = d;
        index = j;
      }
    }
    matched[index] = true;
    // Early pairs get more weight: they had the most choice.
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * best;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

/** $P greedy cloud match: smaller is more alike. Clouds must be the same size. */
export function shapeDistance(a: CloudPoint[], b: CloudPoint[]): number {
  const n = a.length;
  const step = Math.max(1, Math.floor(Math.pow(n, 0.5)));
  let best = Infinity;
  for (let i = 0; i < n; i += step) {
    best = Math.min(best, cloudDistance(a, b, i), cloudDistance(b, a, i));
  }
  return best;
}
