/**
 * Synthetic MoveNet-style landmarks built from joint directions, so "20° off" in
 * a test is a real 20° rotation of a limb rather than a hand-placed point.
 *
 * Image coordinates, y down. Directions in image degrees: 0 right, 90 down,
 * -90 up, 180 left. "left" limbs are the ones on the left of the image, so
 * "outward" is 180 for them and 0 for the right side.
 */
import type { PoseFrame, PoseLandmarks, Point3D } from '../types/pose.types';

export interface Limb {
  upper: number;
  lower: number;
}

export interface SkeletonSpec {
  leftArm: Limb;
  rightArm: Limb;
  leftLeg?: Limb;
  rightLeg?: Limb;
  /** Torso length in frame units (child size on screen). */
  torso?: number;
  cx?: number;
  shoulderY?: number;
  /** Hips raised towards the knees (squat), in torso lengths. */
  hipDrop?: number;
  /** Bending forward: the torso foreshortens on screen by this fraction. */
  bend?: number;
  /** Arms pointing at the camera look shorter in 2D (1 = full length). */
  armLength?: number;
  /** Per-landmark visibility overrides. */
  visibility?: Partial<Record<keyof Omit<PoseLandmarks, 'rawLandmarks'>, number>>;
}

const DOWN: Limb = { upper: 90, lower: 90 };

export const ARMS_DOWN = { leftArm: { upper: 95, lower: 92 }, rightArm: { upper: 85, lower: 88 } };

export function rotate(limb: Limb, deg: number): Limb {
  return { upper: limb.upper + deg, lower: limb.lower + deg };
}

export function skeleton(spec: SkeletonSpec): PoseFrame {
  const T = spec.torso ?? 0.28;
  const cx = spec.cx ?? 0.5;
  const sy = spec.shoulderY ?? 0.32;
  const SW = T / 1.4;
  const vis = spec.visibility ?? {};
  const pt = (name: string, x: number, y: number): Point3D => ({
    x,
    y,
    z: 0,
    visibility: (vis as Record<string, number>)[name] ?? 0.9,
  });
  const step = (o: { x: number; y: number }, deg: number, len: number) => ({
    x: o.x + Math.cos((deg * Math.PI) / 180) * len * T,
    y: o.y + Math.sin((deg * Math.PI) / 180) * len * T,
  });

  const ls = { x: cx - SW / 2, y: sy };
  const rs = { x: cx + SW / 2, y: sy };
  const arm = spec.armLength ?? 1;
  const le = step(ls, spec.leftArm.upper, 0.55 * arm);
  const lw = step(le, spec.leftArm.lower, 0.5 * arm);
  const re = step(rs, spec.rightArm.upper, 0.55 * arm);
  const rw = step(re, spec.rightArm.lower, 0.5 * arm);

  const hipY = sy + T * (1 - (spec.bend ?? 0));
  const lh = { x: cx - SW * 0.35, y: hipY };
  const rh = { x: cx + SW * 0.35, y: hipY };
  // A squat moves the knees up towards the hips (seen from the front).
  const thigh = 0.65 - (spec.hipDrop ?? 0);
  const lk = step(lh, (spec.leftLeg ?? DOWN).upper, thigh);
  const la = step(lk, (spec.leftLeg ?? DOWN).lower, 0.6);
  const rk = step(rh, (spec.rightLeg ?? DOWN).upper, thigh);
  const ra = step(rk, (spec.rightLeg ?? DOWN).lower, 0.6);

  const headY = sy - 0.45 * T;
  const landmarks: PoseLandmarks = {
    nose: pt('nose', cx, headY),
    leftEye: pt('leftEye', cx - 0.06 * T, headY - 0.06 * T),
    rightEye: pt('rightEye', cx + 0.06 * T, headY - 0.06 * T),
    leftEar: pt('leftEar', cx - 0.14 * T, headY),
    rightEar: pt('rightEar', cx + 0.14 * T, headY),
    leftShoulder: pt('leftShoulder', ls.x, ls.y),
    rightShoulder: pt('rightShoulder', rs.x, rs.y),
    leftElbow: pt('leftElbow', le.x, le.y),
    rightElbow: pt('rightElbow', re.x, re.y),
    leftWrist: pt('leftWrist', lw.x, lw.y),
    rightWrist: pt('rightWrist', rw.x, rw.y),
    leftHip: pt('leftHip', lh.x, lh.y),
    rightHip: pt('rightHip', rh.x, rh.y),
    leftKnee: pt('leftKnee', lk.x, lk.y),
    rightKnee: pt('rightKnee', rk.x, rk.y),
    leftAnkle: pt('leftAnkle', la.x, la.y),
    rightAnkle: pt('rightAnkle', ra.x, ra.y),
    rawLandmarks: [],
  };
  return { landmarks, timestamp: 0, confidence: 0.9 };
}

/** Lower body out of frame (MoveNet reports near-zero scores). */
export const LEGS_HIDDEN = {
  leftHip: 0.35,
  rightHip: 0.1,
  leftKnee: 0.05,
  rightKnee: 0.05,
  leftAnkle: 0.02,
  rightAnkle: 0.02,
};
