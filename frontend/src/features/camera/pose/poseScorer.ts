/**
 * Scores a frame against a pose config: 0 (nothing like it) to 1 (spot on).
 *
 * Per check: inside its target range (or within ±tol of its target angle) is
 * full marks, then the score falls linearly to 0 one more tolerance out. The
 * pose score blends the weighted mean of its checks with the weakest one
 * (`minBlend`), so a pose that is a bit off everywhere still passes, but one
 * limb doing something completely different sinks it.
 *
 * Distances are divided by the child's torso length (or 1.4x shoulder width,
 * whichever is larger — bending shortens the torso on screen, turning narrows the
 * shoulders), so the same numbers hold near or far from the camera.
 */

import type { PoseFrame } from '../types/pose.types';
import { isPoseMirrored } from '../validators/primitives';
import {
  POSE_CONFIGS,
  type DerivedPoint,
  type LandmarkName,
  type PoseCheck,
  type PointRef,
  type PointSpec,
  type PoseSpec,
} from './poseConfig';
import { getPoseThresholds, type CheckOverride, type PoseThresholds } from './thresholds';

export { getPoseThresholds, setPoseThresholds, resetPoseThresholds } from './thresholds';
export type { PoseThresholds, CheckOverride } from './thresholds';

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface CheckResult {
  id: string;
  /** 0-1; null when its landmarks were not visible and it was skipped. */
  score: number | null;
  /** The measured value (torso lengths or degrees), for the debug view. */
  value: number | null;
  required: boolean;
  /** Landmarks this check read (after mirroring). */
  landmarks: string[];
}

export interface PoseScore {
  validator: string;
  score: number;
  pass: boolean;
  passScore: number;
  /** The mirrored variant scored best. */
  mirrored: boolean;
  /** Torso length in normalised frame units. */
  scale: number;
  /** Fraction of check weight whose landmarks were visible. */
  coverage: number;
  checks: CheckResult[];
  /** The check holding the pose back, if any. */
  failing: { id: string; landmarks: string[]; reason: 'low_score' | 'not_visible' } | null;
  hint: string | undefined;
  /** Every landmark with its visibility, for drawing. */
  points: { name: string; x: number; y: number; visibility: number }[];
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

type P = { x: number; y: number };

const LANDMARKS: readonly LandmarkName[] = [
  'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
  'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist',
  'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle',
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const wrapDeg = (d: number) => {
  let x = ((d + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
};

function swapSide(name: string): string {
  if (name.startsWith('left')) return 'right' + name.slice(4);
  if (name.startsWith('right')) return 'left' + name.slice(5);
  return name;
}

class Frame {
  constructor(private pose: PoseFrame, private swap: boolean, private minVis: number) {}

  /** A raw landmark if visible, by its (mirrored) name. */
  landmark(name: LandmarkName): (P & { name: string }) | null {
    const real = (this.swap ? swapSide(name) : name) as LandmarkName;
    const pt = this.pose.landmarks[real];
    if (!pt || (pt.visibility ?? 0) < this.minVis) return null;
    return { x: pt.x, y: pt.y, name: real };
  }

  private midOf(a: LandmarkName, b: LandmarkName): { p: P; used: string[] } | null {
    const pa = this.landmark(a);
    const pb = this.landmark(b);
    if (pa && pb) return { p: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }, used: [pa.name, pb.name] };
    const one = pa ?? pb;
    return one ? { p: one, used: [one.name] } : null;
  }

  derived(name: DerivedPoint): { p: P; used: string[] } | null {
    switch (name) {
      case 'shoulderMid': return this.midOf('leftShoulder', 'rightShoulder');
      case 'hipMid': return this.midOf('leftHip', 'rightHip');
      case 'kneeMid': return this.midOf('leftKnee', 'rightKnee');
      case 'belly': {
        const s = this.midOf('leftShoulder', 'rightShoulder');
        const h = this.midOf('leftHip', 'rightHip');
        if (!s || !h) return null;
        // The tummy sits about two thirds of the way down the torso.
        return { p: { x: s.p.x, y: s.p.y + (h.p.y - s.p.y) * 0.65 }, used: [...s.used, ...h.used] };
      }
    }
  }

  ref(r: PointRef): { p: P; used: string[] } | null {
    if (r === 'shoulderMid' || r === 'hipMid' || r === 'kneeMid' || r === 'belly') return this.derived(r);
    const l = this.landmark(r);
    return l ? { p: l, used: [l.name] } : null;
  }

  /** First visible candidate. */
  first(spec: PointSpec) {
    for (const r of typeof spec === 'string' ? [spec] : spec) {
      const got = this.ref(r as PointRef);
      if (got) return got;
    }
    return null;
  }

  /** The visible candidate nearest to `to`. */
  nearest(spec: PointSpec, to: P) {
    let bestHit: { p: P; used: string[] } | null = null;
    let bestD = Infinity;
    for (const r of typeof spec === 'string' ? [spec] : spec) {
      const got = this.ref(r as PointRef);
      if (!got) continue;
      const d = Math.hypot(got.p.x - to.x, got.p.y - to.y);
      if (d < bestD) { bestD = d; bestHit = got; }
    }
    return bestHit;
  }

  /** Torso length in frame units; see the file header. */
  scale(): number {
    const s = this.midOf('leftShoulder', 'rightShoulder');
    const h = this.midOf('leftHip', 'rightHip');
    const ls = this.landmark('leftShoulder');
    const rs = this.landmark('rightShoulder');
    const torso = s && h ? Math.hypot(s.p.x - h.p.x, s.p.y - h.p.y) : 0;
    const shoulders = ls && rs ? Math.hypot(ls.x - rs.x, ls.y - rs.y) * 1.4 : 0;
    const t = Math.max(torso, shoulders);
    // Typical child at a typical distance; only used when neither is visible.
    return t > 0.04 ? t : 0.3;
  }
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function applyOverride<C extends PoseCheck>(check: C, o: CheckOverride | undefined): C {
  return o ? ({ ...check, ...o } as C) : check;
}

function angularScore(errDeg: number, tol: number): number {
  return errDeg <= tol ? 1 : clamp01(1 - (errDeg - tol) / tol);
}

function evaluateCheck(check: PoseCheck, f: Frame, T: number, swap: boolean, th: PoseThresholds): CheckResult {
  const base = { id: check.id, required: !!check.required };
  const skip = (landmarks: string[] = []): CheckResult => ({ ...base, score: null, value: null, landmarks });

  if (check.kind === 'direction') {
    const from = f.first(check.from);
    const to = f.first(check.to);
    if (!from || !to) return skip();
    const theta = (Math.atan2(to.p.y - from.p.y, to.p.x - from.p.x) * 180) / Math.PI;
    const tol = check.tol ?? th.angleToleranceDeg;
    let err: number;
    if (check.target === 'horizontal') err = Math.min(Math.abs(wrapDeg(theta)), Math.abs(wrapDeg(theta - 180)));
    else {
      const t = check.target === 'up' ? -90 : check.target === 'down' ? 90 : swap ? 180 - check.target : check.target;
      err = Math.abs(wrapDeg(theta - t));
    }
    return { ...base, score: angularScore(err, tol), value: theta, landmarks: [...from.used, ...to.used] };
  }

  if (check.kind === 'angle') {
    const a = f.first(check.a);
    const b = f.first(check.b);
    const c = f.first(check.c);
    if (!a || !b || !c) return skip();
    const v1 = { x: a.p.x - b.p.x, y: a.p.y - b.p.y };
    const v2 = { x: c.p.x - b.p.x, y: c.p.y - b.p.y };
    const n = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    if (n === 0) return skip();
    const deg = (Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / n))) * 180) / Math.PI;
    const tol = check.tol ?? th.angleToleranceDeg;
    return { ...base, score: angularScore(Math.abs(deg - check.target), tol), value: deg, landmarks: [...a.used, ...b.used, ...c.used] };
  }

  // Range checks
  const a = f.first(check.a);
  if (!a) return skip();
  const b = check.kind === 'dist' ? f.nearest(check.b, a.p) : f.first(check.b);
  if (!b) return skip();
  let value: number;
  const used = [...a.used, ...b.used];
  switch (check.kind) {
    case 'dist': value = Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) / T; break;
    case 'dy': value = (a.p.y - b.p.y) / T; break;
    case 'adx': value = Math.abs(a.p.x - b.p.x) / T; break;
    case 'crossX': {
      const toward = check.toward ? f.first(check.toward) : null;
      if (!toward) return skip();
      used.push(...toward.used);
      const dir = Math.sign(toward.p.x - b.p.x) || 1;
      value = ((a.p.x - b.p.x) * dir) / T;
      break;
    }
  }
  const tol = check.tol ?? th.distanceTolerance;
  const err =
    check.min !== undefined && value < check.min ? check.min - value
    : check.max !== undefined && value > check.max ? value - check.max
    : 0;
  return { ...base, score: clamp01(1 - err / tol), value, landmarks: used };
}

// ---------------------------------------------------------------------------
// Pose
// ---------------------------------------------------------------------------

function scoreVariant(name: string, spec: PoseSpec, pose: PoseFrame, swap: boolean, th: PoseThresholds) {
  const f = new Frame(pose, swap, th.minVisibility);
  const T = f.scale();
  const overrides = th.poses[name]?.checks;
  const checks = spec.checks.map((c) => applyOverride(c, overrides?.[c.id]));
  const results = checks.map((c) => evaluateCheck(c, f, T, swap, th));

  let total = 0;
  let seen = 0;
  let sum = 0;
  let min = 1;
  let failing: PoseScore['failing'] = null;
  let failingScore = 1;
  let hint: string | undefined;

  results.forEach((r, i) => {
    const w = checks[i].weight ?? 1;
    total += w;
    if (r.score === null) {
      if (r.required && !failing) {
        failing = { id: r.id, landmarks: r.landmarks, reason: 'not_visible' };
        hint = spec.notVisibleHint;
        failingScore = -1;
      }
      return;
    }
    seen += w;
    sum += r.score * w;
    if (r.score < min) min = r.score;
    if (r.score < 1 && r.score < failingScore) {
      failingScore = r.score;
      failing = { id: r.id, landmarks: r.landmarks, reason: 'low_score' };
      hint = checks[i].hint;
    }
  });

  const coverage = total > 0 ? seen / total : 0;
  const requiredMissing = failingScore === -1;
  let score = 0;
  if (!requiredMissing && coverage >= th.minCoverage && seen > 0) {
    score = (1 - th.minBlend) * (sum / seen) + th.minBlend * min;
  } else if (!requiredMissing) {
    hint = spec.notVisibleHint;
  }
  return { score, coverage, results, failing: failing as PoseScore['failing'], hint, T };
}

/** True when `validatorName` is scored by a pose config rather than a primitive. */
export function hasPoseConfig(validatorName: string): boolean {
  return Object.prototype.hasOwnProperty.call(POSE_CONFIGS, validatorName);
}

export function scorePose(validatorName: string, pose: PoseFrame): PoseScore | null {
  const spec = POSE_CONFIGS[validatorName];
  if (!spec) return null;
  const th = getPoseThresholds();

  // Which landmark labelling to try. Side-specific poses under `strictSides`
  // use only the child's own sides (the front camera mirrors the labels, see
  // `setPoseMirrored`); everything else is also tried mirrored.
  const variants: boolean[] =
    spec.sideSpecific && th.strictSides ? [isPoseMirrored()]
    : th.acceptMirrored ? [false, true]
    : [false];

  let best: ReturnType<typeof scoreVariant> & { swap: boolean } = { ...scoreVariant(validatorName, spec, pose, variants[0], th), swap: variants[0] };
  for (const swap of variants.slice(1)) {
    const v = scoreVariant(validatorName, spec, pose, swap, th);
    if (v.score > best.score) best = { ...v, swap };
  }

  const passScore = th.poses[validatorName]?.passScore ?? th.passScore;
  const pass = best.score >= passScore;
  return {
    validator: validatorName,
    score: best.score,
    pass,
    passScore,
    mirrored: best.swap,
    scale: best.T,
    coverage: best.coverage,
    checks: best.results,
    failing: best.failing,
    hint: pass ? undefined : best.hint,
    points: LANDMARKS.map((n) => {
      const p = pose.landmarks[n];
      return { name: n, x: p?.x ?? 0, y: p?.y ?? 0, visibility: p?.visibility ?? 0 };
    }),
  };
}
