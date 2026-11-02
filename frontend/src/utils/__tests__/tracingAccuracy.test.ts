/**
 * Tracing scoring, checked on every character the app can trace: capital
 * letters, digits and every generated guide (small letters, numbers, number
 * names, Hindi). One rule for all of them — its numbers live in
 * tracingThresholds.json — so a change that suits one character but breaks
 * another fails here.
 *
 * A child gets room to wobble (a loose but recognisable character earns
 * stars), while half a character, a scribble or most different characters
 * are sent back. Characters differing by one stroke or a mirror (E on F,
 * d on b) can pass with fewer stars: telling those apart would also fail real
 * children's loose traces.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getGuidePoints, guideStrokes, scoreTrace } from '../tracingAccuracy';
import { scoreActivity, TRACING_HONESTY, TRACING_PASS_RAW } from '../activityScoring';
import { TRACE_GUIDES } from '../traceGuides.generated';

type P = { x: number; y: number };
const W = 340;
const H = 420;
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** A stroke as a finger draws it: points every ~3px. */
const dense = (pts: P[]) => {
  if (pts.length < 2) return pts;
  const out: P[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 3));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  out.push(pts[pts.length - 1]);
  return out;
};
/** A character's size as the scorer measures it: its height, or half its width if flatter. */
const extent = (pts: P[]) => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return Math.max(Math.max(...ys) - Math.min(...ys), (Math.max(...xs) - Math.min(...xs)) / 2, 1);
};
/** Touch jitter: every point off by up to `px`. */
const jitter = (s: P[], px: number) => s.map((p) => ({ x: p.x + (rnd() * 2 - 1) * px, y: p.y + (rnd() * 2 - 1) * px }));
/**
 * A child's loose trace: every stroke shifted by up to `frac` of the
 * character's size, cut a little short (`keep` of its length), with wobble.
 */
const loose = (pts: P[], frac: number, keep: number) => {
  const L = extent(pts);
  return guideStrokes(pts).map((s) => {
    const dx = (rnd() * 2 - 1) * frac * L;
    const dy = (rnd() * 2 - 1) * frac * L;
    const f = rnd() * 6;
    const d = dense(s);
    return d.slice(0, Math.max(2, Math.ceil(d.length * keep))).map((p, i) => ({
      x: p.x + dx + 0.03 * L * Math.sin(i / 7 + f),
      y: p.y + dy + 0.03 * L * Math.cos(i / 9 + f),
    }));
  });
};
const stars = (raw: number) => (raw < TRACING_PASS_RAW ? 0 : scoreActivity(raw, TRACING_HONESTY).stars);

const NAMES = Object.keys(TRACE_GUIDES).map((k) => `Trace ${k}`);
const kindOf = (n: string) =>
  /[ऀ-ॿ]/.test(n) ? 'hindi' : /\d/.test(n) ? 'number' : /^Trace [a-z]{2,}$/.test(n) ? 'word' : /^Trace [A-Z]$/.test(n) ? 'capital' : 'letter';

const results = NAMES.map((name) => {
  const guide = getGuidePoints(name, W, H);
  const score = (strokes: P[][]) => scoreTrace(strokes, guide);
  const all = guideStrokes(guide).map(dense).flat();
  // Half along the character's longer side: the top of a tall one, the left of a wide one.
  const axs = all.map((p) => p.x);
  const ays = all.map((p) => p.y);
  const tall = Math.max(...ays) - Math.min(...ays) >= Math.max(...axs) - Math.min(...axs);
  const along = (p: P) => (tall ? p.y : p.x);
  const mid = all.map(along).sort((a, b) => a - b)[Math.floor(all.length / 2)];
  const pool = NAMES.filter((m) => m !== name && kindOf(m) === kindOf(name));
  const other = getGuidePoints(pool[Math.floor(rnd() * pool.length)], W, H);
  return {
    name,
    careful: stars(score(guideStrokes(guide).map((s) => jitter(dense(s), 4)))),
    loose: stars(score(loose(guide, 0.14, 0.85))),
    half: stars(score([all.filter((p) => along(p) <= mid)])),
    scribble: stars(score([dense(Array.from({ length: 150 }, () => ({ x: rnd() * W, y: rnd() * H })))])),
    wrong: stars(score(guideStrokes(other).map(dense))),
  };
});
const where = (pick: (r: (typeof results)[number]) => boolean) => results.filter(pick).map((r) => r.name);

describe(`tracing accuracy, every character (${NAMES.length})`, () => {
  it('a careful trace (with touch jitter) earns three stars on every character', () => {
    assert.deepEqual(where((r) => r.careful < 3), []);
  });

  it("a child's loose trace (strokes off by up to 14% of the character, a bit short) passes", () => {
    const failed = where((r) => r.loose === 0);
    assert.ok(failed.length <= NAMES.length * 0.03, `loose trace failed on ${failed.length}: ${failed.join(' ')}`);
  });

  it('a scribble is sent back on every character', () => {
    assert.deepEqual(where((r) => r.scribble > 0), []);
  });

  it('half a character is sent back on every character', () => {
    assert.deepEqual(where((r) => r.half > 0), []);
  });

  it('a different character is sent back on most characters', () => {
    // Some characters share most of their strokes (every Hindi letter has the
    // headline, E contains F), so this is a floor that guards against
    // regressions, not a promise that every wrong character fails.
    const sentBack = where((r) => r.wrong === 0);
    assert.ok(sentBack.length >= NAMES.length * 0.55, `wrong character sent back on only ${sentBack.length}`);
  });

  // Real children's traces, rebuilt from screenshots of a 718 x 625 px board whose top-left is at (32, 553).
  const FW = 718;
  const FH = 625;
  const line = (pts: number[][]) => {
    const out: P[] = [];
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      const n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 4);
      for (let k = 0; k < n; k++) out.push({ x: x1 + ((x2 - x1) * k) / n - 32, y: y1 + ((y2 - y1) * k) / n - 553 });
    }
    return out;
  };
  /**
   * The child traced the guide shown at the time. Guides have since been
   * redrawn, so the strokes are mapped from that guide's box on screen onto the
   * current guide's box: the trace stays exactly as loose relative to its letter.
   */
  const real = (guide: string, shownBox: [number, number, number, number], strokes: P[][]) => {
    const g = getGuidePoints(guide, FW, FH);
    const gx = g.map((p) => p.x);
    const gy = g.map((p) => p.y);
    const [x0, x1, y0, y1] = shownBox.map((v, i) => v - (i < 2 ? 32 : 553));
    const sx = (Math.max(...gx) - Math.min(...gx)) / (x1 - x0);
    const sy = (Math.max(...gy) - Math.min(...gy)) / (y1 - y0);
    const mapped = strokes.map((s) =>
      s.map((p) => ({ x: Math.min(...gx) + (p.x - x0) * sx, y: Math.min(...gy) + (p.y - y0) * sy })),
    );
    return stars(scoreTrace(mapped, g));
  };

  it('a real loose F (middle bar low and short) gets 1-2 stars', () => {
    // The F guide shown spanned x 247-540, y 678-1053 on screen.
    const s = real('Letter F', [247, 540, 678, 1053], [
      line([[275, 715], [262, 780], [250, 860], [240, 950], [236, 1010], [243, 1052]]),
      line([[255, 738], [330, 724], [420, 716], [480, 720], [505, 732]]),
      line([[265, 920], [300, 936], [340, 952], [390, 970], [432, 978]]),
    ]);
    assert.ok(s >= 1 && s <= 2, `F earned ${s} stars`);
  });

  it('a real G drawn inside the outline without its crossbar gets 1-2 stars, not 3', () => {
    // The G guide shown spanned x 210-578, y 675-1058 on screen.
    const s = real('Letter G', [210, 578, 675, 1058], [
      line([[425, 712], [360, 722], [305, 765], [268, 830], [255, 900], [272, 960], [318, 1010], [385, 1030], [440, 1012], [480, 962], [500, 900], [497, 860], [490, 838]]),
    ]);
    assert.ok(s >= 1 && s <= 2, `G earned ${s} stars`);
  });

  it('a real H drawn like a 4 (crossbar slanting into one leg) is sent back', () => {
    // The H guide shown spanned x 267-518, y 678-1058 on screen.
    const s = real('Letter H', [267, 518, 678, 1058], [
      line([[280, 715], [310, 745], [322, 800], [322, 900], [328, 985], [340, 995], [400, 960], [470, 922], [505, 905]]),
      line([[498, 1090], [492, 990], [492, 900], [496, 830], [488, 775], [480, 758], [490, 772], [500, 820], [502, 880], [498, 905]]),
    ]);
    assert.equal(s, 0, `H earned ${s} stars`);
  });
});
