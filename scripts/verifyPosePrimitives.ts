/**
 * Synthetic pose harness for the camera activity primitives.
 *
 * WHY THIS EXISTS
 * ---------------
 * The primitives in `frontend/src/features/camera/validators/primitives.ts` decide
 * whether a child has done the activity they were asked to do. There is no test
 * runner in this repo and no way to hold a pose in front of a phone from CI, so
 * every threshold in that file was originally chosen by reasoning about geometry —
 * and two of them were plainly wrong in ways nobody could see: `isSquatting` fired
 * on a child standing still, and `areHandsNearHips` fired on a child with their
 * arms hanging at their sides.
 *
 * This harness builds anatomically plausible 17-keypoint MoveNet poses, runs every
 * registered validator against every pose, and asserts two things per pose:
 *
 *   expect      — this validator MUST fire, with confidence at or above the
 *                 "normal" difficulty threshold (0.68). Catches false negatives.
 *   reject      — this validator must NOT reach that threshold. Catches the
 *                 false positives that make detection feel random.
 *   rejectHard  — this validator must not fire at all, at any difficulty. Reserved
 *                 for genuinely contradictory poses (standing is not squatting).
 *
 * It also asserts that the generator's `REGISTERED_VALIDATORS` allowlist matches
 * `ValidatorRegistry` exactly, so a validator can never be referenced by the
 * catalog without an implementation behind it.
 *
 * WHAT IT IS NOT
 * --------------
 * Synthetic keypoints are clean; real MoveNet output jitters and drops joints. A
 * pass here means the geometry is coherent, not that the model tracks well. On-device
 * behaviour still has to be watched.
 *
 * HOW TO RUN
 * ----------
 * There is no ts-node in this repo, so compile to CommonJS and run the output.
 * Run this from the repository root — the harness locates the repo by walking up
 * from the working directory, and the emitted path below assumes that too.
 *
 *   frontend/node_modules/.bin/tsc --ignoreConfig --ignoreDeprecations 6.0 \
 *     --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
 *     --moduleResolution node --strict --types node \
 *     --typeRoots ./frontend/node_modules/@types --outDir scripts/.build \
 *     scripts/verifyPosePrimitives.ts
 *   node scripts/.build/scripts/verifyPosePrimitives.js
 *
 * `--ignoreDeprecations 6.0` is not optional: TypeScript 6 raises TS5107 for
 * `--moduleResolution node` without it, and the compile fails.
 *
 * Pass `--matrix` to print the full validator-by-pose confidence table.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PoseFrame,
  PoseLandmarks,
  Point3D,
} from '../frontend/src/features/camera/types/pose.types';
import { validatorRegistry } from '../frontend/src/features/camera/catalog/ValidatorRegistry';
import { setPoseMirrored } from '../frontend/src/features/camera/validators/primitives';

// ---------------------------------------------------------------------------
// Thresholds under test
// ---------------------------------------------------------------------------

/** `DIFFICULTY_CONFIG.normal.confidenceThreshold` — the default gate. */
const PASS_NORMAL = 0.68;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

type LMKey = Exclude<keyof PoseLandmarks, 'rawLandmarks'>;

/** COCO / MoveNet keypoint order, as `CameraActivityAdapter` maps it. */
const COCO_ORDER: LMKey[] = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
];

/**
 * A child standing square to the camera, arms hanging at their sides, whole body
 * in frame. Normalised to [0,1] with y increasing downward, matching the engine.
 *
 * Proportions are taken from the real relationships the primitives depend on:
 * shoulder width 0.21, torso (shoulder line to hip line) 0.295 — about 1.4
 * shoulder widths, which is what `bodyScale` assumes for its fallback — and thigh
 * (hip to knee) 0.22, a little over one shoulder width. Getting these right
 * matters: the standing thigh-to-shoulder ratio is what separates standing from
 * squatting, and an over-generous guess there is exactly how `isSquatting` came
 * to accept a standing child.
 */
const BASE: Record<LMKey, [number, number]> = {
  nose: [0.5, 0.13],
  leftEye: [0.478, 0.115],
  rightEye: [0.522, 0.115],
  leftEar: [0.455, 0.125],
  rightEar: [0.545, 0.125],
  leftShoulder: [0.395, 0.235],
  rightShoulder: [0.605, 0.235],
  leftElbow: [0.375, 0.375],
  rightElbow: [0.625, 0.375],
  leftWrist: [0.37, 0.51],
  rightWrist: [0.63, 0.51],
  leftHip: [0.448, 0.53],
  rightHip: [0.552, 0.53],
  leftKnee: [0.445, 0.75],
  rightKnee: [0.555, 0.75],
  leftAnkle: [0.443, 0.96],
  rightAnkle: [0.557, 0.96],
};

const DEFAULT_VIS = 0.9;

type Override = [number, number] | [number, number, number];

function makePose(overrides: Partial<Record<LMKey, Override>> = {}, timestamp = 0): PoseFrame {
  const points: Partial<Record<LMKey, Point3D>> = {};

  for (const key of COCO_ORDER) {
    const src = overrides[key] ?? BASE[key];
    points[key] = {
      x: src[0],
      y: src[1],
      z: 0, // the native bridge has no depth; nothing may rely on it
      visibility: src.length === 3 ? (src[2] as number) : DEFAULT_VIS,
    };
  }

  // Distinct objects per slot — never `Array(n).fill(sharedObject)`.
  const rawLandmarks = COCO_ORDER.map((k) => ({ ...(points[k] as Point3D) }));

  return {
    landmarks: { ...(points as Record<LMKey, Point3D>), rawLandmarks },
    timestamp,
    confidence: 0.9,
  };
}

/** Moves a whole pose, for jumps and sideways steps. */
function shiftPose(pose: PoseFrame, dx: number, dy: number, timestamp: number): PoseFrame {
  const moved: Partial<Record<LMKey, Override>> = {};
  for (const key of COCO_ORDER) {
    const p = pose.landmarks[key];
    moved[key] = [p.x + dx, p.y + dy, p.visibility ?? DEFAULT_VIS];
  }
  return makePose(moved, timestamp);
}

// ---------------------------------------------------------------------------
// Static poses
// ---------------------------------------------------------------------------

const POSES: Record<string, PoseFrame> = {
  /** Arms hanging at the sides. The single most important negative case. */
  standing_arms_down: makePose(),

  both_hands_up: makePose({
    leftWrist: [0.35, 0.08],
    rightWrist: [0.65, 0.08],
    leftElbow: [0.36, 0.19],
    rightElbow: [0.64, 0.19],
  }),

  /**
   * The child's own LEFT hand up, on a mirrored front-camera frame — so MoveNet
   * labels it `rightWrist`. Evaluated with `setPoseMirrored(true)`.
   */
  child_left_hand_up_mirrored: makePose({
    rightWrist: [0.65, 0.08],
    rightElbow: [0.64, 0.19],
  }),

  child_right_hand_up_mirrored: makePose({
    leftWrist: [0.35, 0.08],
    leftElbow: [0.36, 0.19],
  }),

  t_pose: makePose({
    leftWrist: [0.19, 0.235],
    rightWrist: [0.81, 0.235],
    leftElbow: [0.29, 0.235],
    rightElbow: [0.71, 0.235],
  }),

  hands_on_head: makePose({
    leftWrist: [0.44, 0.075],
    rightWrist: [0.56, 0.075],
    leftElbow: [0.34, 0.185],
    rightElbow: [0.66, 0.185],
  }),

  hands_on_cheeks: makePose({
    leftWrist: [0.452, 0.14],
    rightWrist: [0.548, 0.14],
    leftElbow: [0.36, 0.28],
    rightElbow: [0.64, 0.28],
  }),

  hands_on_shoulders: makePose({
    leftWrist: [0.425, 0.245],
    rightWrist: [0.575, 0.245],
    leftElbow: [0.34, 0.36],
    rightElbow: [0.66, 0.36],
  }),

  hand_on_tummy: makePose({
    leftWrist: [0.47, 0.44],
    leftElbow: [0.37, 0.42],
  }),

  /** Bent at the waist, hands at the knees. */
  touch_knees: makePose({
    nose: [0.5, 0.32],
    leftEye: [0.478, 0.305],
    rightEye: [0.522, 0.305],
    leftEar: [0.455, 0.315],
    rightEar: [0.545, 0.315],
    leftShoulder: [0.395, 0.42],
    rightShoulder: [0.605, 0.42],
    leftElbow: [0.4, 0.58],
    rightElbow: [0.6, 0.58],
    leftWrist: [0.45, 0.73],
    rightWrist: [0.55, 0.73],
    leftHip: [0.448, 0.55],
    rightHip: [0.552, 0.55],
  }),

  /** Folded right over — the head drops below the hips. */
  touch_toes: makePose({
    nose: [0.5, 0.66],
    leftEye: [0.478, 0.65],
    rightEye: [0.522, 0.65],
    leftEar: [0.455, 0.655],
    rightEar: [0.545, 0.655],
    leftShoulder: [0.395, 0.6],
    rightShoulder: [0.605, 0.6],
    leftElbow: [0.42, 0.76],
    rightElbow: [0.58, 0.76],
    leftWrist: [0.455, 0.92],
    rightWrist: [0.545, 0.92],
    leftHip: [0.448, 0.5],
    rightHip: [0.552, 0.5],
    leftKnee: [0.445, 0.76],
    rightKnee: [0.555, 0.76],
  }),

  /** Akimbo: wrists on the hip bones, elbows winged out. */
  hands_on_hips: makePose({
    leftWrist: [0.455, 0.525],
    rightWrist: [0.545, 0.525],
    leftElbow: [0.34, 0.44],
    rightElbow: [0.66, 0.44],
  }),

  clap: makePose({
    leftWrist: [0.482, 0.4],
    rightWrist: [0.518, 0.4],
    leftElbow: [0.42, 0.43],
    rightElbow: [0.58, 0.43],
  }),

  /** Each wrist has crossed the centre line to the opposite shoulder. */
  hug: makePose({
    leftWrist: [0.575, 0.3],
    rightWrist: [0.425, 0.3],
    leftElbow: [0.46, 0.42],
    rightElbow: [0.54, 0.42],
  }),

  /** Both hands out in front, chest height, drawn in towards the centre line. */
  hands_forward: makePose({
    leftWrist: [0.44, 0.36],
    rightWrist: [0.56, 0.36],
    leftElbow: [0.4, 0.35],
    rightElbow: [0.6, 0.35],
  }),

  /** Wrists lost behind the body while the torso stays strongly tracked. */
  hands_behind_back: makePose({
    leftWrist: [0.42, 0.55, 0.08],
    rightWrist: [0.58, 0.55, 0.08],
    leftElbow: [0.38, 0.45, 0.4],
    rightElbow: [0.62, 0.45, 0.4],
  }),

  /** Crouched: the hips have dropped almost to the knees. */
  squat: makePose({
    nose: [0.5, 0.24],
    leftEye: [0.478, 0.225],
    rightEye: [0.522, 0.225],
    leftEar: [0.455, 0.235],
    rightEar: [0.545, 0.235],
    leftShoulder: [0.395, 0.345],
    rightShoulder: [0.605, 0.345],
    leftElbow: [0.375, 0.46],
    rightElbow: [0.625, 0.46],
    leftWrist: [0.44, 0.55],
    rightWrist: [0.56, 0.55],
    leftHip: [0.448, 0.6],
    rightHip: [0.552, 0.6],
    leftKnee: [0.42, 0.68],
    rightKnee: [0.58, 0.68],
    leftAnkle: [0.43, 0.95],
    rightAnkle: [0.57, 0.95],
  }),

  star: makePose({
    leftWrist: [0.2, 0.16],
    rightWrist: [0.8, 0.16],
    leftElbow: [0.3, 0.19],
    rightElbow: [0.7, 0.19],
    leftAnkle: [0.36, 0.95],
    rightAnkle: [0.64, 0.95],
  }),

  /** Nobody in frame: every keypoint below the visibility floor. */
  no_child: makePose(
    COCO_ORDER.reduce((acc, key) => {
      acc[key] = [BASE[key][0], BASE[key][1], 0.05];
      return acc;
    }, {} as Partial<Record<LMKey, Override>>),
  ),
};

// ---------------------------------------------------------------------------
// Temporal sequences
// ---------------------------------------------------------------------------

const FRAMES = 12;

function sequence(build: (i: number) => PoseFrame): PoseFrame[] {
  const out: PoseFrame[] = [];
  for (let i = 0; i < FRAMES; i++) out.push(build(i));
  return out;
}

/** A square wave over `i`, so reversals are unambiguous rather than sampled. */
function zigzag(i: number, amplitude: number): number {
  const phase = i % 4;
  if (phase === 0) return 0;
  if (phase === 1) return amplitude;
  if (phase === 2) return 0;
  return -amplitude;
}

const SEQUENCES: Record<string, PoseFrame[]> = {
  /** One hand held high, swinging side to side. */
  wave: sequence((i) => {
    const x = 0.35 + zigzag(i, 0.08);
    return makePose({ leftWrist: [x, 0.08], leftElbow: [0.36, 0.19] }, i * 33);
  }),

  /** The whole body rising and falling. */
  jump: sequence((i) => shiftPose(POSES.standing_arms_down, 0, zigzag(i, -0.11), i * 33)),

  /** Knees lifting alternately. */
  march: sequence((i) => {
    const lift = zigzag(i, 0.1);
    return makePose(
      {
        leftKnee: [0.445, 0.75 - Math.max(lift, 0)],
        rightKnee: [0.555, 0.75 - Math.max(-lift, 0)],
      },
      i * 33,
    );
  }),

  /** Turning away from the camera: the shoulder line foreshortens. */
  spin: sequence((i) => {
    const half = 0.105 * (1 - i / (FRAMES - 1) * 0.85);
    return makePose(
      { leftShoulder: [0.5 - half, 0.235], rightShoulder: [0.5 + half, 0.235] },
      i * 33,
    );
  }),

  /** Travelling sideways across the frame. */
  step_sideways: sequence((i) =>
    shiftPose(POSES.standing_arms_down, (i / (FRAMES - 1)) * 0.2, 0, i * 33),
  ),

  /** Head bobbing while the shoulders stay put. */
  nod: sequence((i) => makePose({ nose: [0.5, 0.13 + zigzag(i, 0.035)] }, i * 33)),

  /** Head turning side to side. */
  shake: sequence((i) => makePose({ nose: [0.5 + zigzag(i, 0.035), 0.13] }, i * 33)),

  /** Frozen, bar a pixel of tracker noise. */
  still: sequence((i) =>
    makePose({ nose: [0.5 + (i % 2 === 0 ? 0.0008 : -0.0008), 0.13] }, i * 33),
  ),

  /** Everything moving at once. */
  wiggle: sequence((i) => shiftPose(POSES.standing_arms_down, zigzag(i, 0.05), zigzag(i + 1, 0.04), i * 33)),
};

// ---------------------------------------------------------------------------
// Expectations
// ---------------------------------------------------------------------------

interface Case {
  /** MUST fire at or above the normal-difficulty threshold. */
  expect?: string[];
  /** Must NOT reach the normal-difficulty threshold. */
  reject?: string[];
  /** Must not fire at all, at any difficulty. Contradictory poses only. */
  rejectHard?: string[];
  /** Front-camera mirroring state to evaluate under. Defaults to true. */
  mirrored?: boolean;
}

const STATIC_CASES: Record<string, Case> = {
  standing_arms_down: {
    expect: ['areHandsBelowHips', 'isStandingUpright'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'isLeftHandRaised',
      'isRightHandRaised',
      'areArmsExtendedSideways',
      'isHandNearHead',
      'areHandsNearFace',
      'areHandsNearShoulders',
      'isHandNearTorso',
      'isHandNearKnees',
      'areHandsNearAnkles',
      'areHandsNearHips',
      'areHandsTouching',
      'isArmCrossedAcrossTorso',
      'areHandsForward',
      'areHandsBehindBack',
      'isSquatting',
      'isStarPose',
    ],
  },

  both_hands_up: {
    expect: ['areHandsAboveShoulders', 'areBothHandsAboveShoulders'],
    reject: ['isLeftHandRaised', 'isRightHandRaised', 'areHandsTouching'],
    rejectHard: [
      'areHandsBelowHips',
      'areHandsNearHips',
      'isHandNearTorso',
      'isHandNearKnees',
      'areHandsNearAnkles',
      'isArmCrossedAcrossTorso',
      'areHandsForward',
      'areHandsBehindBack',
      'isSquatting',
    ],
  },

  child_left_hand_up_mirrored: {
    mirrored: true,
    expect: ['areHandsAboveShoulders', 'isLeftHandRaised'],
    rejectHard: ['areBothHandsAboveShoulders', 'isRightHandRaised'],
  },

  child_right_hand_up_mirrored: {
    mirrored: true,
    expect: ['areHandsAboveShoulders', 'isRightHandRaised'],
    rejectHard: ['areBothHandsAboveShoulders', 'isLeftHandRaised'],
  },

  t_pose: {
    expect: ['areArmsExtendedSideways'],
    reject: ['areHandsAboveShoulders', 'areBothHandsAboveShoulders'],
    rejectHard: [
      'areHandsNearHips',
      'areHandsTouching',
      'areHandsForward',
      'isHandNearHead',
      'areHandsNearFace',
      'isHandNearTorso',
      'isArmCrossedAcrossTorso',
      'areHandsBelowHips',
      'isSquatting',
      'isHandNearKnees',
    ],
  },

  hands_on_head: {
    expect: ['isHandNearHead'],
    rejectHard: [
      'areHandsNearHips',
      'isHandNearKnees',
      'areHandsNearAnkles',
      'isHandNearTorso',
      'isSquatting',
      'areHandsForward',
      'areHandsBelowHips',
      'areHandsTouching',
      'areArmsExtendedSideways',
    ],
  },

  hands_on_cheeks: {
    expect: ['areHandsNearFace', 'isHandNearHead'],
    rejectHard: [
      'areHandsNearHips',
      'isHandNearKnees',
      'isHandNearTorso',
      'areHandsBelowHips',
      'areArmsExtendedSideways',
      'isSquatting',
    ],
  },

  hands_on_shoulders: {
    expect: ['areHandsNearShoulders'],
    reject: ['areHandsAboveShoulders', 'areBothHandsAboveShoulders'],
    rejectHard: [
      'areArmsExtendedSideways',
      'areHandsNearHips',
      'isHandNearKnees',
      'areHandsBelowHips',
      'isSquatting',
      'areHandsForward',
      'isArmCrossedAcrossTorso',
    ],
  },

  hand_on_tummy: {
    expect: ['isHandNearTorso'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areHandsNearHips',
      'isHandNearKnees',
      'areHandsNearFace',
      'isHandNearHead',
      'areHandsTouching',
      'isSquatting',
    ],
  },

  touch_knees: {
    expect: ['isHandNearKnees'],
    reject: ['areHandsNearAnkles'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'areHandsNearHips',
      'isHandNearHead',
      'areHandsNearFace',
      'areHandsNearShoulders',
      'isStandingUpright',
      'areHandsTouching',
      'areArmsExtendedSideways',
    ],
  },

  touch_toes: {
    expect: ['areHandsNearAnkles'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'areHandsNearHips',
      'isHandNearHead',
      'areHandsNearFace',
      'areHandsNearShoulders',
      'isStandingUpright',
      'areHandsTouching',
      'areArmsExtendedSideways',
      'areHandsForward',
    ],
  },

  hands_on_hips: {
    expect: ['areHandsNearHips'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'areHandsTouching',
      'isHandNearHead',
      'areHandsNearFace',
      'areHandsNearShoulders',
      'isHandNearKnees',
      'areHandsNearAnkles',
      'areArmsExtendedSideways',
      'isArmCrossedAcrossTorso',
      'isSquatting',
    ],
  },

  clap: {
    expect: ['areHandsTouching'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'areHandsNearHips',
      'areHandsNearAnkles',
      'isHandNearKnees',
      'areArmsExtendedSideways',
      'isArmCrossedAcrossTorso',
      'areHandsBelowHips',
      'isSquatting',
    ],
  },

  hug: {
    expect: ['isArmCrossedAcrossTorso'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'areHandsTouching',
      'areHandsNearHips',
      'isHandNearKnees',
      'areArmsExtendedSideways',
      'areHandsBelowHips',
      'isSquatting',
    ],
  },

  hands_forward: {
    expect: ['areHandsForward'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'areHandsTouching',
      'areHandsNearHips',
      'isHandNearKnees',
      'areArmsExtendedSideways',
      'areHandsBelowHips',
      'isSquatting',
      'isHandNearHead',
    ],
  },

  hands_behind_back: {
    expect: ['areHandsBehindBack'],
    rejectHard: [
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'areHandsBelowHips',
      'areHandsNearHips',
      'areHandsTouching',
      'isHandNearKnees',
      'areHandsForward',
      'areArmsExtendedSideways',
      'isArmCrossedAcrossTorso',
      'isHandNearHead',
      'areHandsNearFace',
    ],
  },

  squat: {
    expect: ['isSquatting'],
    rejectHard: [
      'isStandingUpright',
      'areHandsAboveShoulders',
      'areBothHandsAboveShoulders',
      'isHandNearHead',
      'areHandsNearFace',
      'areArmsExtendedSideways',
      'isStarPose',
    ],
  },

  star: {
    expect: ['isStarPose', 'areArmsExtendedSideways'],
    rejectHard: [
      'areHandsNearHips',
      'areHandsTouching',
      'isHandNearKnees',
      'areHandsBelowHips',
      'isSquatting',
      'isArmCrossedAcrossTorso',
      'areHandsForward',
      'isHandNearTorso',
    ],
  },

  /**
   * Nothing detectable in frame. Every validator must decline — the participation
   * check especially, since it is the one that could be tempted to pass on
   * nothing.
   */
  no_child: {
    rejectHard: validatorRegistry.listValidators(),
  },
};

const TEMPORAL_CASES: Record<string, Case> = {
  wave: {
    expect: ['isHandMovingHorizontally'],
    rejectHard: [
      'isBodyMovingVertically',
      'isMarchingInPlace',
      'isBodyRotating',
      'isSteppingSideways',
      'isHeadNoddingVertically',
      'isHeadShakingHorizontally',
      'isBodyStill',
    ],
  },

  jump: {
    expect: ['isBodyMovingVertically'],
    rejectHard: ['isBodyStill', 'isMarchingInPlace', 'isBodyRotating', 'isHandMovingHorizontally'],
  },

  march: {
    expect: ['isMarchingInPlace'],
    /**
     * Lifting a knee shortens the hip-to-knee gap and brings the knee up towards
     * a hanging hand, so both of these used to fire on a marching child without
     * the hand or the hips moving at all.
     */
    reject: ['isSquatting', 'isHandNearKnees'],
    rejectHard: [
      'isBodyMovingVertically',
      'isBodyRotating',
      'isSteppingSideways',
      'isHandMovingHorizontally',
      'isHeadNoddingVertically',
      'isHeadShakingHorizontally',
      // Knees pumping is not a freeze. The knee y-positions had to be added to
      // the motion signals for this to be true.
      'isBodyStill',
    ],
  },

  spin: {
    expect: ['isBodyRotating'],
    rejectHard: [
      'isMarchingInPlace',
      'isBodyMovingVertically',
      'isHandMovingHorizontally',
      // Turning on the spot is not a freeze. Rotation barely moves a joint up or
      // down, so this needed the shoulder-span signal.
      'isBodyStill',
    ],
  },

  step_sideways: {
    expect: ['isSteppingSideways'],
    rejectHard: [
      'isBodyMovingVertically',
      'isMarchingInPlace',
      'isBodyRotating',
      'isHandMovingHorizontally',
      // Travelling across the frame is not a freeze — slowly, but a long way.
      'isBodyStill',
    ],
  },

  nod: {
    expect: ['isHeadNoddingVertically'],
    reject: ['isBodyStill'],
    rejectHard: [
      'isHeadShakingHorizontally',
      'isBodyMovingVertically',
      'isMarchingInPlace',
      'isSteppingSideways',
      'isHandMovingHorizontally',
    ],
  },

  shake: {
    expect: ['isHeadShakingHorizontally'],
    reject: ['isBodyStill'],
    rejectHard: [
      'isHeadNoddingVertically',
      'isBodyMovingVertically',
      'isMarchingInPlace',
      'isSteppingSideways',
      'isHandMovingHorizontally',
    ],
  },

  still: {
    expect: ['isBodyStill', 'isChildParticipating'],
    rejectHard: [
      'isBodyWiggling',
      'isBodyMovingVertically',
      'isMarchingInPlace',
      'isBodyRotating',
      'isSteppingSideways',
      'isHeadNoddingVertically',
      'isHeadShakingHorizontally',
      'isHandMovingHorizontally',
    ],
  },

  wiggle: {
    expect: ['isBodyWiggling'],
    rejectHard: ['isBodyStill'],
  },
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

interface Failure {
  scenario: string;
  validator: string;
  kind: 'expect' | 'reject' | 'rejectHard';
  detail: string;
}

const failures: Failure[] = [];
const matrix: Array<{ scenario: string; scores: Record<string, number> }> = [];

const ALL_VALIDATORS = validatorRegistry.listValidators();

function evaluateAll(pose: PoseFrame, history?: PoseFrame[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const name of ALL_VALIDATORS) {
    const fn = validatorRegistry.resolveValidator(name);
    if (!fn) {
      failures.push({
        scenario: '(registry)',
        validator: name,
        kind: 'expect',
        detail: 'listed by listValidators() but resolveValidator() returned null',
      });
      continue;
    }
    const result = fn(pose, history);
    scores[name] = result.detected ? result.confidence : 0;
  }
  return scores;
}

function check(scenario: string, spec: Case, scores: Record<string, number>): void {
  for (const name of spec.expect ?? []) {
    const score = scores[name] ?? 0;
    if (score < PASS_NORMAL) {
      failures.push({
        scenario,
        validator: name,
        kind: 'expect',
        detail: score === 0 ? 'did not fire at all' : `fired at ${score.toFixed(3)}, below ${PASS_NORMAL}`,
      });
    }
  }

  for (const name of spec.reject ?? []) {
    const score = scores[name] ?? 0;
    if (score >= PASS_NORMAL) {
      failures.push({
        scenario,
        validator: name,
        kind: 'reject',
        detail: `passed at ${score.toFixed(3)}, should stay below ${PASS_NORMAL}`,
      });
    }
  }

  for (const name of spec.rejectHard ?? []) {
    const score = scores[name] ?? 0;
    if (score > 0) {
      failures.push({
        scenario,
        validator: name,
        kind: 'rejectHard',
        detail: `fired at ${score.toFixed(3)}, should not fire at all`,
      });
    }
  }
}

function runStatic(): void {
  for (const [name, pose] of Object.entries(POSES)) {
    const spec = STATIC_CASES[name] ?? {};
    setPoseMirrored(spec.mirrored ?? true);
    const scores = evaluateAll(pose);
    matrix.push({ scenario: `static/${name}`, scores });
    check(`static/${name}`, spec, scores);
  }
  setPoseMirrored(true);
}

function runTemporal(): void {
  for (const [name, history] of Object.entries(SEQUENCES)) {
    const spec = TEMPORAL_CASES[name] ?? {};
    setPoseMirrored(spec.mirrored ?? true);
    const scores = evaluateAll(history[history.length - 1], history);
    matrix.push({ scenario: `temporal/${name}`, scores });
    check(`temporal/${name}`, spec, scores);
  }
  setPoseMirrored(true);
}

/**
 * Every validator must be exercised by at least one `expect`, otherwise a
 * primitive could rot untested behind a green run.
 */
function checkCoverage(): void {
  const exercised = new Set<string>();
  for (const spec of [...Object.values(STATIC_CASES), ...Object.values(TEMPORAL_CASES)]) {
    for (const name of spec.expect ?? []) exercised.add(name);
  }
  for (const name of ALL_VALIDATORS) {
    if (!exercised.has(name)) {
      failures.push({
        scenario: '(coverage)',
        validator: name,
        kind: 'expect',
        detail: 'no scenario asserts this validator ever fires',
      });
    }
  }
}

/**
 * `scripts/generateCatalog.ts` refuses to emit an activity whose validator is not
 * in its own allowlist. If that list and the registry drift apart, the catalog can
 * name a validator with no implementation (silently unavailable at runtime) or
 * reject a validator that exists.
 */
function checkGeneratorAllowlist(): void {
  const root = findRepoRoot();
  if (!root) {
    failures.push({
      scenario: '(generator)',
      validator: '-',
      kind: 'expect',
      detail: 'could not locate scripts/generateCatalog.ts from the working directory',
    });
    return;
  }

  const src = fs.readFileSync(path.join(root, 'scripts', 'generateCatalog.ts'), 'utf8');
  const block = /REGISTERED_VALIDATORS[^=]*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/.exec(src);
  if (!block) {
    failures.push({
      scenario: '(generator)',
      validator: '-',
      kind: 'expect',
      detail: 'REGISTERED_VALIDATORS set not found in generateCatalog.ts',
    });
    return;
  }

  const declared = new Set<string>();
  for (const m of block[1].matchAll(/'([A-Za-z0-9_]+)'/g)) declared.add(m[1]);

  for (const name of ALL_VALIDATORS) {
    if (!declared.has(name)) {
      failures.push({
        scenario: '(generator)',
        validator: name,
        kind: 'expect',
        detail: 'registered in ValidatorRegistry but missing from REGISTERED_VALIDATORS',
      });
    }
  }
  for (const name of declared) {
    if (!ALL_VALIDATORS.includes(name)) {
      failures.push({
        scenario: '(generator)',
        validator: name,
        kind: 'reject',
        detail: 'allowed by the generator but not registered in ValidatorRegistry',
      });
    }
  }
}

/** Every activity in the generated catalog must name a real validator. */
function checkCatalog(): void {
  const root = findRepoRoot();
  if (!root) return;

  const file = path.join(
    root,
    'frontend',
    'src',
    'features',
    'camera',
    'catalog',
    'activities.generated.json',
  );
  if (!fs.existsSync(file)) return;

  const payload = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    activities?: Array<{ id: string; validatorName: string }>;
  };
  const activities = payload.activities ?? [];

  for (const act of activities) {
    if (!validatorRegistry.hasValidator(act.validatorName)) {
      failures.push({
        scenario: `catalog/${act.id}`,
        validator: act.validatorName,
        kind: 'expect',
        detail: 'catalog references a validator that is not registered',
      });
    }
  }

  console.log(`Catalog: ${activities.length} activities, all validators resolvable.`);
}

function findRepoRoot(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'scripts', 'generateCatalog.ts'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function printMatrix(): void {
  console.log('\nConfidence matrix (blank = did not fire)\n');
  for (const row of matrix) {
    const fired = Object.entries(row.scores)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v.toFixed(2)}`);
    console.log(`  ${row.scenario}`);
    console.log(`    ${fired.length ? fired.join(', ') : '(nothing fired)'}`);
  }
}

function main(): void {
  console.log(`Pose primitive harness — ${ALL_VALIDATORS.length} validators registered.`);

  runStatic();
  runTemporal();
  checkCoverage();
  checkGeneratorAllowlist();
  checkCatalog();

  if (process.argv.includes('--matrix')) printMatrix();

  const scenarios = Object.keys(POSES).length + Object.keys(SEQUENCES).length;
  console.log(`\nScenarios: ${scenarios} (${Object.keys(POSES).length} static, ${Object.keys(SEQUENCES).length} temporal)`);

  if (failures.length === 0) {
    console.log('PASS — every expectation held.');
    return;
  }

  console.log(`\nFAIL — ${failures.length} expectation(s) not met:\n`);
  const byScenario = new Map<string, Failure[]>();
  for (const f of failures) {
    const list = byScenario.get(f.scenario) ?? [];
    list.push(f);
    byScenario.set(f.scenario, list);
  }
  for (const [scenario, list] of byScenario) {
    console.log(`  ${scenario}`);
    for (const f of list) {
      console.log(`    [${f.kind}] ${f.validator}: ${f.detail}`);
    }
  }
  process.exitCode = 1;
}

main();
