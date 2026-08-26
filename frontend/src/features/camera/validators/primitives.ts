/**
 * Pose primitives — the geometry that decides whether a child is actually doing
 * the activity they were asked to do.
 *
 * WHAT WAS WRONG BEFORE
 * ---------------------
 * This file previously reported success far more often than it should have, which
 * is why detection felt inaccurate across activities:
 *
 *  1. `isHandMovingHorizontally` (wave) and `isBodyMovingVertically` (jump)
 *     ignored their input entirely and unconditionally returned
 *     `{ detected: true }`. Every wave and jump activity passed the instant it
 *     started, whatever the child did.
 *  2. Every primitive returned the same hardcoded `confidence: 0.65`, so a clean
 *     pose and a borderline one were indistinguishable, and the difficulty and
 *     quality tuning that feeds `confidenceThreshold` had nothing to act on.
 *  3. Tolerances were absolute rather than relative to the child's size on
 *     screen. `areHandsAboveShoulders` allowed a fixed `+0.12` of frame height,
 *     which is a small nudge for a child close to the camera and most of the
 *     torso for one standing far back. `getShoulderWidth` fell back to `0.35`
 *     (a third of the frame) whenever shoulders were occluded, which inflated
 *     every `1.2 * shoulderWidth` proximity test into "anywhere near the body".
 *  4. Left and right were never distinguished: `areHandsAboveShoulders` ORed the
 *     two wrists, so "raise both hands", "raise left hand" and "raise right
 *     hand" were all the same test, satisfied by one hand.
 *
 * HOW IT WORKS NOW
 * ----------------
 * Every test is normalised by `bodyScale` (shoulder width, falling back to torso
 * length) so it behaves the same whether the child is near or far, and every test
 * returns a graded confidence built from `ramp()` rather than a constant. A pose
 * that is comfortably correct scores near 1.0; one at the edge of tolerance
 * scores just above the detection floor; one outside tolerance does not fire.
 *
 * Tolerances are deliberately forgiving — the target age is 3-8 and a child's
 * "hands on hips" is approximate — but they are bounded, so a genuinely
 * different pose fails. Forgiving, not unconditional.
 *
 * COORDINATE SYSTEM
 * -----------------
 * MoveNet SinglePose Lightning, 17 COCO keypoints, normalised to [0,1].
 * `x` increases to the right, `y` increases DOWNWARD — so "higher on the body"
 * means a SMALLER y. There is no usable depth: the native bridge sets `z = 0`
 * for every point, so nothing here may rely on it.
 */

import { PoseFrame, ValidationResult } from '../types/pose.types';

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/**
 * Minimum keypoint score to trust a landmark. MoveNet is a single-person model
 * and reports low scores for occluded joints; 0.3 keeps partially visible limbs
 * usable without accepting pure noise.
 */
const MIN_VISIBILITY = 0.3;

/**
 * Confidence assigned to a pose that only just qualifies. Detection implies a
 * confidence in [DETECT_FLOOR, 1], which keeps `detected` and the numeric
 * confidence consistent for the session engine's threshold gate.
 */
const DETECT_FLOOR = 0.6;

/** Fallback body scale when neither shoulders nor hips are usable. */
const FALLBACK_SCALE = 0.25;

/** Frames of history a temporal primitive needs before it will commit. */
const MIN_HISTORY = 6;

/**
 * Where "raised" begins and ends, in body-scale units above the shoulder line.
 *
 * Shared by the three raise primitives so they cannot drift apart. `RAISE_ZERO`
 * sits just below the shoulder rather than well below it: with the old -0.1 a
 * T-pose scored 0.69, which cleared the normal-difficulty gate, so "stretch your
 * arms out wide" also counted as "raise your hands".
 */
const RAISE_FULL = 0.3;
const RAISE_ZERO = -0.05;

// ---------------------------------------------------------------------------
// Front-camera mirroring
// ---------------------------------------------------------------------------

/**
 * The native preprocessor mirrors the front-camera frame horizontally before
 * inference (`YuvToByteBufferConverter`, `if (isFrontCamera) sampleX = srcWidth
 * - 1 - sampleX`). MoveNet is trained on unmirrored images, so on a mirrored
 * frame it assigns anatomical labels to the wrong side: the child's real LEFT
 * wrist lands on the image's left, where a forward-facing person's RIGHT wrist
 * would be, and is labelled `rightWrist`.
 *
 * Only the handful of side-specific activities ("raise left hand") care, but for
 * those it is the difference between right and exactly wrong. The engine keeps
 * this in step with the active lens; it defaults to mirrored because
 * `CameraSession` starts on the front camera.
 */
let mirrored = true;

/** Called when the active lens changes so side-specific tests stay correct. */
export function setPoseMirrored(isMirrored: boolean): void {
  mirrored = isMirrored;
}

export function isPoseMirrored(): boolean {
  return mirrored;
}

type Pt = { x: number; y: number; visibility?: number };

/** The wrist on the child's own left, accounting for mirroring. */
function childLeftWrist(pose: PoseFrame): Pt {
  return mirrored ? pose.landmarks.rightWrist : pose.landmarks.leftWrist;
}

/** The wrist on the child's own right, accounting for mirroring. */
function childRightWrist(pose: PoseFrame): Pt {
  return mirrored ? pose.landmarks.leftWrist : pose.landmarks.rightWrist;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function ok(pt?: Pt): boolean {
  return !!pt && (pt.visibility ?? 0) >= MIN_VISIBILITY;
}

function allOk(...pts: Array<Pt | undefined>): boolean {
  return pts.every(ok);
}

function anyOk(...pts: Array<Pt | undefined>): boolean {
  return pts.some(ok);
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(a.visibility ?? 0, b.visibility ?? 0) };
}

/**
 * Linear confidence ramp. Returns 1 at or beyond `full`, 0 at or beyond `zero`,
 * interpolating in between. Direction is inferred, so callers can express
 * "smaller is better" (`full < zero`, e.g. a distance) or "larger is better"
 * (`full > zero`, e.g. height above a joint) with the same helper.
 */
function ramp(value: number, full: number, zero: number): number {
  if (full === zero) return value === full ? 1 : 0;
  return clamp01((value - zero) / (full - zero));
}

/**
 * The child's size on screen, used to normalise every threshold.
 *
 * Shoulder width is the most stable reference when both shoulders are visible.
 * When they are not, torso length (shoulder midpoint to hip midpoint) is a
 * reasonable stand-in. The old code's fixed 0.35 fallback is deliberately gone:
 * it was larger than most real shoulder widths, so it loosened every downstream
 * proximity test at exactly the moment tracking was least reliable.
 */
function bodyScale(pose: PoseFrame): number {
  const { leftShoulder, rightShoulder, leftHip, rightHip } = pose.landmarks;

  if (allOk(leftShoulder, rightShoulder)) {
    const w = dist(leftShoulder, rightShoulder);
    if (w > 0.02) return w;
  }

  if (anyOk(leftShoulder, rightShoulder) && anyOk(leftHip, rightHip)) {
    const sy = ok(leftShoulder) ? leftShoulder.y : rightShoulder.y;
    const hy = ok(leftHip) ? leftHip.y : rightHip.y;
    const torso = Math.abs(hy - sy);
    // A torso runs roughly 1.4x shoulder width on a young child.
    if (torso > 0.03) return torso / 1.4;
  }

  return FALLBACK_SCALE;
}

/** Shoulder line y, or whichever shoulder is visible. */
function shoulderY(pose: PoseFrame): number | null {
  const { leftShoulder, rightShoulder } = pose.landmarks;
  if (allOk(leftShoulder, rightShoulder)) return (leftShoulder.y + rightShoulder.y) / 2;
  if (ok(leftShoulder)) return leftShoulder.y;
  if (ok(rightShoulder)) return rightShoulder.y;
  return null;
}

/** Hip line y, or whichever hip is visible. */
function hipY(pose: PoseFrame): number | null {
  const { leftHip, rightHip } = pose.landmarks;
  if (allOk(leftHip, rightHip)) return (leftHip.y + rightHip.y) / 2;
  if (ok(leftHip)) return leftHip.y;
  if (ok(rightHip)) return rightHip.y;
  return null;
}

function miss(name: string, feedback?: string): ValidationResult {
  return { detected: false, confidence: 0, primitiveName: name, feedback };
}

/**
 * Builds a result from a 0-1 quality score. Quality 0 means "outside tolerance"
 * and does not fire; anything above maps onto [DETECT_FLOOR, 1] so that
 * `detected` and `confidence` can never disagree.
 */
function graded(name: string, quality: number, feedback?: string): ValidationResult {
  const q = clamp01(quality);
  if (q <= 0) return miss(name, feedback);
  return {
    detected: true,
    confidence: DETECT_FLOOR + (1 - DETECT_FLOOR) * q,
    primitiveName: name,
    feedback,
  };
}

/** Best (highest) quality across several candidate measurements. */
function best(...qualities: number[]): number {
  return qualities.reduce((m, q) => (q > m ? q : m), 0);
}

/**
 * Proximity of `a` to `b`, scaled by body size. `fullAt` and `zeroAt` are
 * multiples of `bodyScale`, so the same numbers hold at any camera distance.
 */
function nearness(a: Pt, b: Pt, scale: number, fullAt: number, zeroAt: number): number {
  if (!allOk(a, b)) return 0;
  return ramp(dist(a, b) / scale, fullAt, zeroAt);
}

// ---------------------------------------------------------------------------
// Static primitives — hands relative to the body
// ---------------------------------------------------------------------------

/**
 * Either hand raised above the shoulder line.
 *
 * Height is measured in body-scale units above the shoulder, so it reads the
 * same close up or far away. A hand a third of a shoulder-width above the
 * shoulder is unambiguous (quality 1); a hand level with the shoulder scores just
 * under the normal-difficulty gate, so arms held straight out sideways are not a
 * raise at normal strictness but still pass on easy; a hand below the shoulder
 * line is not a raise at all.
 */
export function areHandsAboveShoulders(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_above_shoulders';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;
  const scale = bodyScale(pose);

  const lift = (wrist: Pt, shoulder: Pt): number => {
    if (!allOk(wrist, shoulder)) return 0;
    return ramp((shoulder.y - wrist.y) / scale, RAISE_FULL, RAISE_ZERO);
  };

  const q = best(lift(leftWrist, leftShoulder), lift(rightWrist, rightShoulder));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Lift a hand up above your shoulder!');
}

/**
 * Both hands raised. Scored as the weaker of the two arms so one raised hand
 * cannot carry the pose — the specific failure that made "raise both hands"
 * indistinguishable from "raise one hand".
 */
export function areBothHandsAboveShoulders(pose: PoseFrame): ValidationResult {
  const NAME = 'both_hands_above_shoulders';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;

  if (!allOk(leftWrist, rightWrist)) {
    return miss(NAME, 'Show both hands to the camera!');
  }

  const scale = bodyScale(pose);
  const sy = shoulderY(pose);
  if (sy === null) return miss(NAME, 'Let the camera see your shoulders!');

  const ly = ok(leftShoulder) ? leftShoulder.y : sy;
  const ry = ok(rightShoulder) ? rightShoulder.y : sy;

  const left = ramp((ly - leftWrist.y) / scale, RAISE_FULL, RAISE_ZERO);
  const right = ramp((ry - rightWrist.y) / scale, RAISE_FULL, RAISE_ZERO);

  const q = Math.min(left, right);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Raise both hands high!');
}

/** Only the child's own left hand raised — the right stays down. */
export function isLeftHandRaised(pose: PoseFrame): ValidationResult {
  return oneHandRaised(pose, 'left');
}

/** Only the child's own right hand raised — the left stays down. */
export function isRightHandRaised(pose: PoseFrame): ValidationResult {
  return oneHandRaised(pose, 'right');
}

/**
 * Shared implementation for the side-specific raises. Requires the named hand up
 * AND the other hand not up, otherwise "raise your left hand" would accept both
 * hands raised — which is a different activity.
 */
function oneHandRaised(pose: PoseFrame, side: 'left' | 'right'): ValidationResult {
  const NAME = side === 'left' ? 'left_hand_raised' : 'right_hand_raised';
  const wanted = side === 'left' ? childLeftWrist(pose) : childRightWrist(pose);
  const other = side === 'left' ? childRightWrist(pose) : childLeftWrist(pose);

  const sy = shoulderY(pose);
  if (sy === null || !ok(wanted)) {
    return miss(NAME, `Show your ${side} hand to the camera!`);
  }

  const scale = bodyScale(pose);
  const up = ramp((sy - wanted.y) / scale, RAISE_FULL, RAISE_ZERO);
  if (up <= 0) return miss(NAME, `Raise your ${side} hand!`);

  // The other hand should be at or below the shoulder. If it is clearly up too,
  // this is "both hands", not a one-sided raise.
  let downQ = 1;
  if (ok(other)) {
    downQ = ramp((sy - other.y) / scale, RAISE_ZERO, RAISE_FULL);
  }
  if (downQ <= 0) {
    return miss(NAME, `Just your ${side} hand — keep the other one down!`);
  }

  return graded(NAME, Math.min(up, downQ));
}

/**
 * Hands lowered to the sides — "hands down", "arms at your sides". Previously
 * mapped to `areHandsAboveShoulders`, i.e. the exact opposite test.
 */
export function areHandsBelowHips(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_below_hips';
  const { leftWrist, rightWrist } = pose.landmarks;
  const hy = hipY(pose);
  if (hy === null) return miss(NAME, 'Let the camera see you!');
  if (!anyOk(leftWrist, rightWrist)) return miss(NAME, 'Show your hands!');

  const scale = bodyScale(pose);
  const drop = (w: Pt): number => (ok(w) ? ramp((w.y - hy) / scale, 0.2, -0.45) : 1);

  const q = Math.min(drop(leftWrist), drop(rightWrist));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Put your hands down by your sides!');
}

/**
 * Arms stretched out sideways — the T-pose behind "stretch arms wide", "bird",
 * "airplane", "butterfly".
 *
 * Two conditions: each wrist is far from the body centre horizontally, and is
 * roughly level with the shoulders vertically. Without the vertical check a
 * hands-on-hips pose would qualify on width alone.
 */
export function areArmsExtendedSideways(pose: PoseFrame): ValidationResult {
  const NAME = 'arms_extended_sideways';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;

  if (!allOk(leftWrist, rightWrist) || !allOk(leftShoulder, rightShoulder)) {
    return miss(NAME, 'Stretch both arms out to the sides!');
  }

  const scale = bodyScale(pose);
  const centreX = (leftShoulder.x + rightShoulder.x) / 2;
  const sy = (leftShoulder.y + rightShoulder.y) / 2;

  const arm = (w: Pt): number => {
    const spread = ramp(Math.abs(w.x - centreX) / scale, 1.1, 0.55);
    const level = ramp(Math.abs(w.y - sy) / scale, 0.3, 0.95);
    return Math.min(spread, level);
  };

  const q = Math.min(arm(leftWrist), arm(rightWrist));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Stretch your arms out wide like wings!');
}

/**
 * A hand up at the head — "touch head", "hands over head".
 *
 * Tightened from the old `1.2 * shoulderWidth`, which reached well past the head
 * and fired for a hand resting near the collarbone.
 */
export function isHandNearHead(pose: PoseFrame): ValidationResult {
  const NAME = 'hand_near_head';
  const { leftWrist, rightWrist, nose, leftEar, rightEar } = pose.landmarks;
  const scale = bodyScale(pose);

  const toHead = (w: Pt): number =>
    best(
      nearness(w, nose, scale, 0.5, 1.05),
      nearness(w, leftEar, scale, 0.45, 1.0),
      nearness(w, rightEar, scale, 0.45, 1.0),
    );

  const q = best(toHead(leftWrist), toHead(rightWrist));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Put a hand on top of your head!');
}

/** Hands up at the face — "hands on cheeks". */
export function areHandsNearFace(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_near_face';
  const { nose, leftEar, rightEar } = pose.landmarks;
  const lw = childLeftWrist(pose);
  const rw = childRightWrist(pose);
  const scale = bodyScale(pose);

  const toFace = (w: Pt): number =>
    best(
      nearness(w, nose, scale, 0.55, 1.1),
      nearness(w, leftEar, scale, 0.5, 1.0),
      nearness(w, rightEar, scale, 0.5, 1.0),
    );

  const q = Math.min(toFace(lw), toFace(rw));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Put both hands on your cheeks!');
}

/** Hands at the shoulders — "touch shoulders". */
export function areHandsNearShoulders(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_near_shoulders';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;
  const scale = bodyScale(pose);

  // Either hand to either shoulder — children cross over as often as not.
  const toShoulder = (w: Pt): number =>
    best(
      nearness(w, leftShoulder, scale, 0.4, 0.9),
      nearness(w, rightShoulder, scale, 0.4, 0.9),
    );

  const q = best(toShoulder(leftWrist), toShoulder(rightWrist));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Touch your shoulders!');
}

/**
 * A hand on the middle of the body — "touch tummy".
 *
 * Tightened twice: first from the old `1.2 * shoulderWidth`, then again when the
 * synthetic harness showed a child with their arms hanging at their sides scoring
 * 0.79 here. A relaxed wrist sits about 0.73 scale units from the belly point, so
 * anything looser than ~0.62 cannot tell "hand on tummy" from "arm at rest".
 */
export function isHandNearTorso(pose: PoseFrame): ValidationResult {
  const NAME = 'hand_near_torso';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder, leftHip, rightHip } = pose.landmarks;

  if (!anyOk(leftShoulder, rightShoulder) || !anyOk(leftHip, rightHip)) {
    return miss(NAME, 'Let the camera see your body!');
  }

  const scale = bodyScale(pose);
  const sy = shoulderY(pose) as number;
  const hy = hipY(pose) as number;
  const cx =
    allOk(leftShoulder, rightShoulder) ? (leftShoulder.x + rightShoulder.x) / 2
    : ok(leftShoulder) ? leftShoulder.x
    : rightShoulder.x;

  // The tummy sits about two thirds of the way down the torso.
  const belly: Pt = { x: cx, y: sy + (hy - sy) * 0.65, visibility: 1 };

  const q = best(nearness(leftWrist, belly, scale, 0.35, 0.62), nearness(rightWrist, belly, scale, 0.35, 0.62));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Put a hand on your tummy!');
}

/**
 * A hand down at the knees — "touch knees".
 *
 * The zero point is 0.75 body-scale units, not 1.0. A child standing with their
 * arms relaxed already has a wrist about 1.14 units from the knee, so a 1.0
 * cut-off left almost no margin: lifting one knee while marching closed the gap
 * to ~0.75 without the hand moving at all, and scored 0.78 for "touch your
 * knees". Three quarters of a shoulder width is still a generous reach.
 */
export function isHandNearKnees(pose: PoseFrame): ValidationResult {
  const NAME = 'hand_near_knees';
  const { leftWrist, rightWrist, leftKnee, rightKnee } = pose.landmarks;
  const scale = bodyScale(pose);

  const toKnee = (w: Pt): number =>
    best(nearness(w, leftKnee, scale, 0.35, 0.75), nearness(w, rightKnee, scale, 0.35, 0.75));

  const q = best(toKnee(leftWrist), toKnee(rightWrist));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Bend down and touch your knees!');
}

/**
 * Hands reaching the ankles — "touch toes".
 *
 * Ankles frequently sit outside the frame, so this also accepts wrists dropping
 * well below the knee line, which is the observable part of the same motion.
 */
export function areHandsNearAnkles(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_near_ankles';
  const { leftWrist, rightWrist, leftAnkle, rightAnkle, leftKnee, rightKnee } = pose.landmarks;
  const scale = bodyScale(pose);

  const toAnkle = (w: Pt): number =>
    best(nearness(w, leftAnkle, scale, 0.5, 1.1), nearness(w, rightAnkle, scale, 0.5, 1.1));

  let q = best(toAnkle(leftWrist), toAnkle(rightWrist));

  if (q <= 0 && anyOk(leftKnee, rightKnee)) {
    const ky = ok(leftKnee) ? leftKnee.y : rightKnee.y;
    const belowKnee = (w: Pt): number => (ok(w) ? ramp((w.y - ky) / scale, 0.5, 0.0) : 0);
    q = best(belowKnee(leftWrist), belowKnee(rightWrist));
  }

  return q > 0 ? graded(NAME, q) : miss(NAME, 'Reach down and touch your toes!');
}

/**
 * Hands resting on the hips.
 *
 * The tolerance here has to be genuinely tight. Standing with arms relaxed puts
 * the wrist about 0.38 scale units from the hip joint — close enough that the
 * original 0.4/0.85 window scored a child doing nothing at all at 1.00, which made
 * every "hands on hips" activity complete on arrival. Hands actually placed on the
 * hips land within ~0.1, and on the waist within ~0.2, so the window closes at
 * 0.36.
 */
export function areHandsNearHips(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_near_hips';
  const { leftWrist, rightWrist, leftHip, rightHip } = pose.landmarks;
  const scale = bodyScale(pose);

  const HIP_FULL = 0.2;
  const HIP_ZERO = 0.36;

  const left = best(
    nearness(leftWrist, leftHip, scale, HIP_FULL, HIP_ZERO),
    nearness(leftWrist, rightHip, scale, HIP_FULL, HIP_ZERO),
  );
  const right = best(
    nearness(rightWrist, leftHip, scale, HIP_FULL, HIP_ZERO),
    nearness(rightWrist, rightHip, scale, HIP_FULL, HIP_ZERO),
  );

  // Prefer both hands on the hips, but accept one when the other is occluded.
  const q = allOk(leftWrist, rightWrist) ? Math.min(left, right) : best(left, right);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Put your hands on your hips!');
}

/**
 * Hands clasped together — "clap", "wash your hands".
 *
 * Palms together puts the wrists roughly one palm width apart, which is about
 * 0.22 scale units. The old 0.15/0.6 window reached 0.43 and further, which is
 * where the wrists sit when the hands are resting on the hips or hanging by the
 * knees — both scored above 0.7 as "clapping".
 */
export function areHandsTouching(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_touching';
  const { leftWrist, rightWrist } = pose.landmarks;

  if (!allOk(leftWrist, rightWrist)) return miss(NAME, 'Show both hands to the camera!');

  const scale = bodyScale(pose);
  const q = ramp(dist(leftWrist, rightWrist) / scale, 0.22, 0.42);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Bring your hands together and clap!');
}

/**
 * Arms folded across the chest — "hug yourself".
 *
 * Requires each wrist to have crossed to the opposite side of the body as well
 * as being near the far shoulder. Distance alone was satisfied by a hand resting
 * on its own shoulder.
 */
export function isArmCrossedAcrossTorso(pose: PoseFrame): ValidationResult {
  const NAME = 'arms_crossed_torso';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;

  if (!allOk(leftShoulder, rightShoulder)) return miss(NAME, 'Let the camera see your shoulders!');

  const scale = bodyScale(pose);
  const centreX = (leftShoulder.x + rightShoulder.x) / 2;
  // Which way is "across" depends on which shoulder is on which side of centre.
  const leftIsLeftOfCentre = leftShoulder.x < centreX;

  const crossed = (w: Pt, ownIsLeft: boolean): number => {
    if (!ok(w)) return 0;
    const past = ownIsLeft ? (w.x - centreX) / scale : (centreX - w.x) / scale;
    const opposite = ownIsLeft ? rightShoulder : leftShoulder;
    // The wrist must be past the centre line, not merely approaching it: allowing
    // -0.15 meant two hands clasped in front of the chest scored as a hug.
    return Math.min(ramp(past, 0.3, 0), nearness(w, opposite, scale, 0.55, 1.15));
  };

  const l = crossed(leftWrist, leftIsLeftOfCentre);
  const r = crossed(rightWrist, !leftIsLeftOfCentre);

  const q = allOk(leftWrist, rightWrist) ? best(Math.min(l, r), best(l, r) * 0.7) : best(l, r) * 0.7;
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Wrap your arms around yourself for a hug!');
}

/**
 * Hands out in front of the body — "reach hands forward", "drive a car".
 *
 * The bridge gives no depth, so forward reach cannot be measured directly. What
 * is observable is the silhouette: the wrists pull in towards the body centre
 * horizontally while staying between shoulder and hip height. This is a
 * deliberately weaker signal than the other primitives and is capped as such.
 */
export function areHandsForward(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_forward';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;

  if (!allOk(leftWrist, rightWrist) || !allOk(leftShoulder, rightShoulder)) {
    return miss(NAME, 'Hold both hands out in front of you!');
  }

  const scale = bodyScale(pose);
  const centreX = (leftShoulder.x + rightShoulder.x) / 2;
  const sy = (leftShoulder.y + rightShoulder.y) / 2;
  const hy = hipY(pose);

  const arm = (w: Pt): number => {
    // Drawn in towards the centre line: at rest the wrist sits ~0.62 scale units
    // out, so the old 0.8 cut-off scored a standing child at 0.69.
    const inward = ramp(Math.abs(w.x - centreX) / scale, 0.2, 0.55);
    // Clearly below the shoulder line, which is what separates "held out in
    // front" from "hands resting on the shoulders".
    const belowShoulder = ramp((w.y - sy) / scale, 0.35, 0.05);
    const aboveHips = hy === null ? 1 : ramp((hy - w.y) / scale, 0.1, -0.4);
    return Math.min(inward, belowShoulder, aboveHips);
  };

  // Capped at 0.85: without depth this cannot be as certain as a geometric pose.
  const q = Math.min(arm(leftWrist), arm(rightWrist)) * 0.85;
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Reach your hands out in front!');
}

/**
 * Hands hidden behind the back.
 *
 * Detected by absence: the wrists stop being visible while the torso stays
 * clearly tracked. Deliberately conservative, since "wrists not found" is also
 * what a tracking failure looks like — hence the requirement that shoulders and
 * hips remain strong.
 */
export function areHandsBehindBack(pose: PoseFrame): ValidationResult {
  const NAME = 'hands_behind_back';
  const { leftWrist, rightWrist, leftShoulder, rightShoulder, leftHip, rightHip } = pose.landmarks;

  const torsoStrong =
    allOk(leftShoulder, rightShoulder) &&
    anyOk(leftHip, rightHip) &&
    Math.min(leftShoulder.visibility ?? 0, rightShoulder.visibility ?? 0) >= 0.5;

  if (!torsoStrong) return miss(NAME, 'Stand where the camera can see you!');

  const hiddenScore = (w: Pt): number => ramp(w.visibility ?? 0, 0.15, 0.45);
  const q = Math.min(hiddenScore(leftWrist), hiddenScore(rightWrist)) * 0.85;

  return q > 0 ? graded(NAME, q) : miss(NAME, 'Hide your hands behind your back!');
}

// ---------------------------------------------------------------------------
// Static primitives — whole-body posture
// ---------------------------------------------------------------------------

/**
 * Crouched or seated — "sit down", "frog", "pick a flower".
 *
 * Uses the hip-to-knee vertical gap relative to body scale: standing keeps the
 * hips well above the knees, crouching closes that gap.
 *
 * The upper bound matters more than it looks. A child's thigh is a little over one
 * shoulder width, so a standing child measures ~1.05 here — and the original 1.25
 * cut-off therefore scored *every standing pose in the harness* at 0.70, above the
 * normal-difficulty gate. Every squat, sit and crouch activity completed the
 * moment the camera found the child. Standing now scores zero.
 *
 * 0.78 rather than 0.9 for a second reason: marching on the spot lifts one knee,
 * which pulls the two-knee average up to ~0.81, and at 0.9 a marching child scored
 * exactly the pass mark for "sit down". The child must now actually close the gap
 * by about a quarter before any credit is given.
 */
export function isSquatting(pose: PoseFrame): ValidationResult {
  const NAME = 'squatting';
  const { leftKnee, rightKnee } = pose.landmarks;
  const hy = hipY(pose);

  if (hy === null || !anyOk(leftKnee, rightKnee)) {
    return miss(NAME, 'Step back so the camera can see your legs!');
  }

  const scale = bodyScale(pose);
  const ky = ok(leftKnee) && ok(rightKnee) ? (leftKnee.y + rightKnee.y) / 2 : ok(leftKnee) ? leftKnee.y : rightKnee.y;

  const q = ramp((ky - hy) / scale, 0.45, 0.78);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Bend your knees and crouch down low!');
}

/**
 * Upright and settled — "stand up", "stand like a star", "freeze like a statue".
 * Purely postural; stillness over time is `isBodyStill`.
 *
 * The torso term reads the projected shoulder-to-hip length, which foreshortens as
 * a child bends forward: ~1.4 standing, ~0.62 bent over to touch their knees. The
 * lower bound is 0.7 for that reason — at the original 0.5 a child folded over
 * their knees still scored 0.68 as "standing up tall".
 */
export function isStandingUpright(pose: PoseFrame): ValidationResult {
  const NAME = 'standing_upright';
  const { leftKnee, rightKnee } = pose.landmarks;
  const sy = shoulderY(pose);
  const hy = hipY(pose);

  if (sy === null || hy === null) return miss(NAME, 'Stand where the camera can see you!');

  const scale = bodyScale(pose);
  const torso = ramp((hy - sy) / scale, 1.1, 0.7);

  let legs = 1;
  if (anyOk(leftKnee, rightKnee)) {
    const ky = ok(leftKnee) && ok(rightKnee) ? (leftKnee.y + rightKnee.y) / 2 : ok(leftKnee) ? leftKnee.y : rightKnee.y;
    legs = ramp((ky - hy) / scale, 1.15, 0.5);
  }

  const q = Math.min(torso, legs);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Stand up nice and tall!');
}

/** Arms and legs spread — "stand like a star". */
export function isStarPose(pose: PoseFrame): ValidationResult {
  const NAME = 'star_pose';
  const arms = areArmsExtendedSideways(pose);
  const { leftAnkle, rightAnkle, leftHip, rightHip } = pose.landmarks;

  if (!arms.detected) return miss(NAME, 'Make a big star shape with your arms and legs!');

  let legs = 1;
  if (allOk(leftAnkle, rightAnkle) && anyOk(leftHip, rightHip)) {
    const scale = bodyScale(pose);
    const hipSpan = allOk(leftHip, rightHip) ? Math.abs(leftHip.x - rightHip.x) : scale * 0.8;
    legs = ramp(Math.abs(leftAnkle.x - rightAnkle.x) / Math.max(hipSpan, 0.02), 1.6, 0.9);
  }

  // Arm confidence is already graded; fold the leg spread in.
  const armQ = (arms.confidence - DETECT_FLOOR) / (1 - DETECT_FLOOR);
  const q = Math.min(armQ, Math.max(legs, 0.35));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Spread your arms and legs like a star!');
}

// ---------------------------------------------------------------------------
// Temporal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a numeric signal across the history window, skipping frames where the
 * measurement is unavailable.
 */
function series(history: PoseFrame[], pick: (f: PoseFrame) => number | null): number[] {
  const out: number[] = [];
  for (const f of history) {
    const v = pick(f);
    if (v !== null && Number.isFinite(v)) out.push(v);
  }
  return out;
}

/**
 * Counts direction reversals in a signal, ignoring wobbles smaller than
 * `minAmplitude`. This is what distinguishes a wave (repeated reversals) from a
 * hand simply being moved once from A to B.
 *
 * The old implementation measured net displacement between the first and last
 * frame, which is close to zero for any oscillation — a vigorous wave and a
 * motionless hand scored the same.
 */
function countReversals(values: number[], minAmplitude: number): number {
  if (values.length < 3) return 0;

  let reversals = 0;
  let direction = 0;
  let extreme = values[0];

  for (let i = 1; i < values.length; i++) {
    const delta = values[i] - extreme;
    if (Math.abs(delta) < minAmplitude) continue;

    const dir = delta > 0 ? 1 : -1;
    if (direction !== 0 && dir !== direction) reversals++;
    direction = dir;
    extreme = values[i];
  }

  return reversals;
}

/** Peak-to-trough spread of a signal. */
function amplitude(values: number[]): number {
  if (values.length === 0) return 0;
  let lo = values[0];
  let hi = values[0];
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return hi - lo;
}

/** Mean absolute frame-to-frame change — a simple motion energy measure. */
function meanStep(values: number[]): number {
  if (values.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < values.length; i++) sum += Math.abs(values[i] - values[i - 1]);
  return sum / (values.length - 1);
}

/** The most recent frame that has usable landmarks. */
function latestOf(history: PoseFrame[], fallback: PoseFrame | null): PoseFrame | null {
  if (history.length > 0) return history[history.length - 1];
  return fallback;
}

// ---------------------------------------------------------------------------
// Temporal primitives
// ---------------------------------------------------------------------------

/**
 * Waving — a raised hand oscillating side to side.
 *
 * Replaces a stub that returned `detected: true` for every frame regardless of
 * input. Requires the hand to be up (a wave at hip height is not a wave), and
 * the horizontal position to reverse direction at least twice with meaningful
 * amplitude relative to body size.
 */
export function isHandMovingHorizontally(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'hand_moving_horizontally';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) return miss(NAME, 'Wave your hand side to side!');

  const scale = bodyScale(latest);

  // Pick whichever wrist is raised higher in the latest frame and follow it.
  const { leftWrist, rightWrist } = latest.landmarks;
  const useLeft =
    ok(leftWrist) && (!ok(rightWrist) || leftWrist.y <= rightWrist.y);
  const pickWrist = (f: PoseFrame): Pt => (useLeft ? f.landmarks.leftWrist : f.landmarks.rightWrist);

  const wrist = pickWrist(latest);
  const sy = shoulderY(latest);
  if (!ok(wrist) || sy === null) return miss(NAME, 'Hold your hand up where I can see it!');

  const raised = ramp((sy - wrist.y) / scale, 0.25, -0.35);
  if (raised <= 0) return miss(NAME, 'Lift your hand up and wave!');

  const xs = series(history, (f) => (ok(pickWrist(f)) ? pickWrist(f).x : null));
  if (xs.length < MIN_HISTORY) return miss(NAME, 'Keep your hand in view and wave!');

  const minAmp = scale * 0.12;
  const reversals = countReversals(xs, minAmp);
  const spread = amplitude(xs) / scale;

  const swing = ramp(reversals, 3, 1);
  const width = ramp(spread, 0.55, 0.18);

  const q = Math.min(best(swing, width * 0.8), Math.max(raised, 0.5));
  return q > 0 && reversals >= 1
    ? graded(NAME, q)
    : miss(NAME, 'Wave your hand back and forth!');
}

/**
 * Jumping — the whole body rising and falling.
 *
 * Replaces a stub that always reported success. Tracks the shoulder line, which
 * stays in frame far more reliably than ankles, and looks for vertical travel
 * with at least one reversal. Ankle lift is used as a bonus when visible.
 */
export function isBodyMovingVertically(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'body_moving_vertically';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) return miss(NAME, 'Get ready to jump!');

  const scale = bodyScale(latest);
  const ys = series(history, (f) => shoulderY(f));
  if (ys.length < MIN_HISTORY) return miss(NAME, 'Step back so I can see you!');

  const travel = amplitude(ys) / scale;
  const reversals = countReversals(ys, scale * 0.1);

  const height = ramp(travel, 0.6, 0.18);
  const bounce = ramp(reversals, 2, 0);

  const q = Math.min(height, Math.max(bounce, 0.4));
  return q > 0 && travel > 0.18
    ? graded(NAME, q)
    : miss(NAME, 'Jump up high with both feet!');
}

/**
 * Marching or walking in place — knees lifting alternately.
 *
 * Tracks the difference between the two knee heights. Alternating lifts make
 * that difference swing back and forth through zero; standing still, or lifting
 * both knees together, does not.
 */
export function isMarchingInPlace(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'marching_in_place';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) return miss(NAME, 'Start marching!');

  const scale = bodyScale(latest);
  const diffs = series(history, (f) => {
    const { leftKnee, rightKnee } = f.landmarks;
    return allOk(leftKnee, rightKnee) ? leftKnee.y - rightKnee.y : null;
  });

  if (diffs.length < MIN_HISTORY) return miss(NAME, 'Step back so I can see your knees!');

  const reversals = countReversals(diffs, scale * 0.1);
  const swing = amplitude(diffs) / scale;

  const alternation = ramp(reversals, 2, 0);
  const lift = ramp(swing, 0.5, 0.15);

  const q = Math.min(alternation, lift);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'March! Lift your knees up one at a time!');
}

/**
 * Turning or spinning — "spin once", "turn left", "turn right".
 *
 * As the body rotates away from the camera the shoulder line foreshortens, so
 * the projected shoulder width collapses relative to its own recent maximum.
 * That ratio is a robust rotation cue and needs no depth.
 */
export function isBodyRotating(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'body_rotating';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) return miss(NAME, 'Turn around slowly!');

  const widths = series(history, (f) => {
    const { leftShoulder, rightShoulder } = f.landmarks;
    return allOk(leftShoulder, rightShoulder) ? Math.abs(leftShoulder.x - rightShoulder.x) : null;
  });

  if (widths.length < MIN_HISTORY) return miss(NAME, 'Let the camera see your shoulders!');

  const widest = Math.max(...widths);
  const narrowest = Math.min(...widths);
  if (widest < 0.02) return miss(NAME, 'Step back so I can see you!');

  // Facing the camera squarely gives ratio ~1; turned side-on collapses it.
  const collapse = 1 - narrowest / widest;
  const q = ramp(collapse, 0.55, 0.2);

  return q > 0 ? graded(NAME, q) : miss(NAME, 'Turn your body all the way around!');
}

/**
 * Stepping to one side — "step left", "step right".
 *
 * Measures how far the body centre travelled horizontally across the window,
 * relative to body scale.
 */
export function isSteppingSideways(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'stepping_sideways';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) return miss(NAME, 'Take a step to the side!');

  const scale = bodyScale(latest);
  const xs = series(history, (f) => {
    const { leftShoulder, rightShoulder } = f.landmarks;
    if (allOk(leftShoulder, rightShoulder)) return (leftShoulder.x + rightShoulder.x) / 2;
    if (ok(leftShoulder)) return leftShoulder.x;
    if (ok(rightShoulder)) return rightShoulder.x;
    return null;
  });

  if (xs.length < MIN_HISTORY) return miss(NAME, 'Step back so I can see you!');

  const q = ramp(amplitude(xs) / scale, 0.8, 0.25);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Take a big step to the side!');
}

/** Nodding — the head bobbing vertically while the shoulders stay put. */
export function isHeadNoddingVertically(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  return headMotion(history, current, 'vertical');
}

/** Shaking the head — the head swinging horizontally. */
export function isHeadShakingHorizontally(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  return headMotion(history, current, 'horizontal');
}

/**
 * Shared head-motion detector. The nose is measured relative to the shoulder
 * line so that walking towards the camera, or the whole body swaying, is not
 * mistaken for a nod or a shake.
 */
function headMotion(
  history: PoseFrame[],
  current: PoseFrame | undefined,
  axis: 'vertical' | 'horizontal',
): ValidationResult {
  const NAME = axis === 'vertical' ? 'head_nodding' : 'head_shaking';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) {
    return miss(NAME, axis === 'vertical' ? 'Nod your head yes!' : 'Shake your head no!');
  }

  const scale = bodyScale(latest);

  const signal = series(history, (f) => {
    const { nose, leftShoulder, rightShoulder } = f.landmarks;
    if (!ok(nose)) return null;
    if (axis === 'vertical') {
      const sy =
        allOk(leftShoulder, rightShoulder) ? (leftShoulder.y + rightShoulder.y) / 2
        : ok(leftShoulder) ? leftShoulder.y
        : ok(rightShoulder) ? rightShoulder.y
        : null;
      return sy === null ? null : nose.y - sy;
    }
    const sx =
      allOk(leftShoulder, rightShoulder) ? (leftShoulder.x + rightShoulder.x) / 2
      : ok(leftShoulder) ? leftShoulder.x
      : ok(rightShoulder) ? rightShoulder.x
      : null;
    return sx === null ? null : nose.x - sx;
  });

  if (signal.length < MIN_HISTORY) return miss(NAME, 'Let the camera see your face!');

  const reversals = countReversals(signal, scale * 0.05);
  const swing = amplitude(signal) / scale;

  const rhythm = ramp(reversals, 2, 0);
  const size = ramp(swing, 0.35, 0.08);

  const q = Math.min(rhythm, size);
  return q > 0
    ? graded(NAME, q)
    : miss(NAME, axis === 'vertical' ? 'Nod your head up and down!' : 'Turn your head side to side!');
}

/**
 * Holding still — "freeze like a statue".
 *
 * Judged on how far the BUSIEST tracked part travelled across the window, not on
 * the body's average per-frame speed. The average let one limb move freely: a
 * child waving an arm vigorously scored 0.78 as "frozen", because six still
 * signals diluted one moving one. And per-frame speed missed slow travel
 * entirely — a child strolling sideways across the whole frame moves only a
 * fraction of a body-width per frame, and scored 0.73.
 *
 * Peak-to-trough spread answers the question a freeze actually asks: did any
 * part of you leave where it was? Tracker jitter on a genuinely motionless child
 * stays well inside the full-credit band.
 */
export function isBodyStill(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'body_still';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) return miss(NAME, 'Hold very still!');

  const scale = bodyScale(latest);
  const motion = bodyMotionEnergy(history, scale);
  if (motion === null) return miss(NAME, 'Step back so I can see you!');

  const q = ramp(motion.range, 0.14, 0.28);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Freeze! Try not to move at all!');
}

/** Moving energetically — "wiggle", "shake", "celebrate". */
export function isBodyWiggling(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'body_wiggling';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Stand in front of the camera!');
  if (!history || history.length < MIN_HISTORY) return miss(NAME, 'Wiggle your body!');

  const scale = bodyScale(latest);
  const motion = bodyMotionEnergy(history, scale);
  if (motion === null) return miss(NAME, 'Step back so I can see you!');

  // Whole-body speed here — a wiggle is meant to involve all of you, so the mean
  // is the honest measure and one flapping hand should not carry the whole body.
  const q = ramp(motion.mean, 0.09, 0.02);
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Wiggle and move your body around!');
}

interface MotionEnergy {
  /** Average per-frame movement across every usable signal. */
  mean: number;
  /** Largest peak-to-trough travel of any single signal over the window. */
  range: number;
}

/**
 * How much the tracked body moved over the history window, in body-scale units.
 *
 * The signal list matters as much as the arithmetic. Knees, the hip line and the
 * shoulder width are all included alongside the head and hands: without knees, a
 * child marching on the spot measured as motionless, and without shoulder width,
 * so did a child turning on the spot — rotation barely moves a joint vertically
 * but collapses the shoulder line.
 *
 * Signals with too little usable history are skipped rather than counted as
 * zero, so a joint that is out of frame does not quietly report stillness.
 */
function bodyMotionEnergy(history: PoseFrame[], scale: number): MotionEnergy | null {
  const signals: Array<(f: PoseFrame) => number | null> = [
    (f) => (ok(f.landmarks.nose) ? f.landmarks.nose.x : null),
    (f) => (ok(f.landmarks.nose) ? f.landmarks.nose.y : null),
    (f) => (ok(f.landmarks.leftWrist) ? f.landmarks.leftWrist.x : null),
    (f) => (ok(f.landmarks.leftWrist) ? f.landmarks.leftWrist.y : null),
    (f) => (ok(f.landmarks.rightWrist) ? f.landmarks.rightWrist.x : null),
    (f) => (ok(f.landmarks.rightWrist) ? f.landmarks.rightWrist.y : null),
    (f) => shoulderY(f),
    (f) => shoulderSpan(f),
    (f) => hipY(f),
    (f) => (ok(f.landmarks.leftKnee) ? f.landmarks.leftKnee.y : null),
    (f) => (ok(f.landmarks.rightKnee) ? f.landmarks.rightKnee.y : null),
  ];

  let total = 0;
  let widest = 0;
  let counted = 0;

  for (const pick of signals) {
    const vals = series(history, pick);
    if (vals.length >= MIN_HISTORY) {
      total += meanStep(vals);
      const spread = amplitude(vals);
      if (spread > widest) widest = spread;
      counted++;
    }
  }

  if (counted === 0) return null;
  return { mean: total / counted / scale, range: widest / scale };
}

/** Horizontal distance between the shoulders, or null when either is untracked. */
function shoulderSpan(frame: PoseFrame): number | null {
  const { leftShoulder, rightShoulder } = frame.landmarks;
  if (!allOk(leftShoulder, rightShoulder)) return null;
  return Math.abs(leftShoulder.x - rightShoulder.x);
}

// ---------------------------------------------------------------------------
// Participation
// ---------------------------------------------------------------------------

/**
 * Participation check for activities this model cannot verify.
 *
 * MoveNet SinglePose gives 17 body keypoints: nose, eyes, ears, shoulders,
 * elbows, wrists, hips, knees, ankles. There are no mouth landmarks and no
 * fingers, so "smile", "laugh", "blink", "wink", "puff cheeks", "thumbs up",
 * "show both palms" and "tiny hands (pinch)" are not detectable — no amount of
 * threshold tuning changes that. Detecting them would need a face-mesh and a
 * hand-landmark model running alongside this one.
 *
 * Rather than silently passing (which is what mapping them to
 * `areHandsAboveShoulders` did) or failing a child who is doing it perfectly,
 * this validates what genuinely can be observed: the child is present, facing
 * the camera, upper body in frame, and settled rather than running around. The
 * activity then works as guided imitation, with an adult or the mascot leading.
 *
 * It is named for what it measures. Nothing here claims to see a smile.
 */
export function isChildParticipating(history: PoseFrame[], current?: PoseFrame): ValidationResult {
  const NAME = 'child_participating';
  const latest = latestOf(history ?? [], current ?? null);
  if (!latest) return miss(NAME, 'Come and stand in front of the camera!');

  const { nose, leftEye, rightEye, leftShoulder, rightShoulder } = latest.landmarks;

  // Present: the upper body is tracked.
  if (!anyOk(leftShoulder, rightShoulder)) {
    return miss(NAME, 'Step in front of the camera so I can see you!');
  }

  // Facing the camera: the face is visible.
  if (!ok(nose)) return miss(NAME, 'Look at the camera!');

  const facing = best(
    ok(leftEye) && ok(rightEye) ? 1 : 0,
    anyOk(leftEye, rightEye) ? 0.7 : 0,
    0.45, // nose alone still counts, weakly
  );

  const framed = allOk(leftShoulder, rightShoulder) ? 1 : 0.7;

  // Settled: some movement is fine, careering around the room is not.
  let settled = 0.8;
  if (history && history.length >= MIN_HISTORY) {
    const motion = bodyMotionEnergy(history, bodyScale(latest));
    // Whole-body mean: one waving hand is not "careering around the room".
    if (motion !== null) settled = ramp(motion.mean, 0.02, 0.16);
  }

  const q = Math.min(facing, framed, Math.max(settled, 0.4));
  return q > 0 ? graded(NAME, q) : miss(NAME, 'Stand still and look at the camera!');
}
