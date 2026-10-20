/**
 * One config per static pose: which landmarks matter, what they should do, and
 * how far off they may be.
 *
 * WHY THIS REPLACES THE HAND-WRITTEN PRIMITIVES FOR STATIC POSES
 * --------------------------------------------------------------
 * The primitives in `validators/primitives.ts` encoded each pose as a few narrow
 * ramps in shoulder-width units (hands on hips: full credit within 0.20, nothing
 * past 0.36 — a few centimetres on a child). Combined with a hold that had to be
 * continuous and decayed 1.5x faster than it filled, a child whose pose wobbled
 * for one frame lost their progress, and a pose that was roughly right never
 * counted at all. Here every pose is data:
 *
 *  - Units are torso lengths, so near and far children score the same.
 *  - Each check has a target and a tolerance, and degrades linearly past it:
 *    20° off with a 30° tolerance is full marks, 60° off is zero.
 *  - Only the landmarks a pose needs are read. Checks whose landmarks are not
 *    visible are skipped (unless `required`), so a half-visible child is judged
 *    on what the camera can see.
 *  - One-sided poses are tried mirrored too, so "either hand" needs one spec.
 *
 * Tolerances are tuned in `poseThresholds.json`, not here.
 *
 * Temporal validators (wave, jump, march, ...) and `areHandsBehindBack` (which
 * works from wrists being hidden, not from geometry) stay in `primitives.ts`.
 *
 * Coordinates: MoveNet, normalised [0,1], x to the right, y DOWN.
 */

import type { PoseLandmarks } from '../types/pose.types';

export type LandmarkName = Exclude<keyof PoseLandmarks, 'rawLandmarks'>;

/** Midpoints computed from whichever of the pair is visible. */
export type DerivedPoint = 'shoulderMid' | 'hipMid' | 'kneeMid' | 'belly';

export type PointRef = LandmarkName | DerivedPoint;

/** One point, or several candidates (the nearest / first visible is used). */
export type PointSpec = PointRef | readonly PointRef[];

interface CheckBase {
  /** Stable id, used for overrides in poseThresholds.json and in the debug view. */
  readonly id: string;
  /** Pose fails outright when this check's landmarks are not visible. */
  readonly required?: boolean;
  /** Relative weight in the pose score (default 1). */
  readonly weight?: number;
  /** Said to the child when this is the check holding the pose back. */
  readonly hint: string;
}

/**
 * A measured value that should sit in [min, max] (either bound optional).
 * Outside the range the score falls linearly, reaching 0 `tol` beyond it.
 *
 *  dist — Euclidean distance a→b; with several `b` candidates, the nearest.
 *  dy   — (a.y - b.y): positive when a is BELOW b.
 *  adx  — |a.x - b.x|: horizontal spread.
 *  crossX — how far a has crossed past `ref` towards `toward` (positive = crossed).
 */
export interface RangeCheck extends CheckBase {
  readonly kind: 'dist' | 'dy' | 'adx' | 'crossX';
  readonly a: PointSpec;
  readonly b: PointSpec;
  /** crossX only: the side a should cross over to. */
  readonly toward?: PointSpec;
  readonly min?: number;
  readonly max?: number;
  /** Torso lengths; default `distanceTolerance`. */
  readonly tol?: number;
}

/**
 * Direction of the segment from→to, in image degrees: 0 points right, 90 down,
 * -90 up. 'up' / 'down' / 'horizontal' are side-neutral; a numeric target is
 * mirrored (180 - θ) when the pose is tried mirrored.
 */
export interface DirectionCheck extends CheckBase {
  readonly kind: 'direction';
  readonly from: PointSpec;
  readonly to: PointSpec;
  readonly target: number | 'up' | 'down' | 'horizontal';
  /** Degrees; default `angleToleranceDeg`. */
  readonly tol?: number;
}

/** Joint angle at `b` between b→a and b→c, 0-180°. */
export interface AngleCheck extends CheckBase {
  readonly kind: 'angle';
  readonly a: PointSpec;
  readonly b: PointSpec;
  readonly c: PointSpec;
  readonly target: number;
  readonly tol?: number;
}

export type PoseCheck = RangeCheck | DirectionCheck | AngleCheck;

export interface PoseSpec {
  /** Written for the child's left side where sides matter; mirrored automatically. */
  readonly checks: readonly PoseCheck[];
  /** The pose names a side ("raise your left hand"); see `strictSides`. */
  readonly sideSpecific?: boolean;
  /** Said when too little of the body is visible to judge. */
  readonly notVisibleHint: string;
}

// ---------------------------------------------------------------------------
// Reusable pieces
// ---------------------------------------------------------------------------

const wristUp = (side: 'left' | 'right', required = true): RangeCheck => ({
  id: `${side}WristUp`,
  kind: 'dy',
  a: `${side}Wrist`,
  b: `${side}Shoulder`,
  // At least a tenth of a torso above the shoulder. A T-pose (level) scores 0.5
  // and fails on its own, so "arms out wide" is not "hands up".
  max: -0.1,
  tol: 0.2,
  required,
  hint: side === 'left' ? 'Lift your hand up high!' : 'Lift your other hand up high too!',
});

const armPointsUp = (side: 'left' | 'right'): DirectionCheck => ({
  id: `${side}ArmUp`,
  kind: 'direction',
  from: `${side}Shoulder`,
  to: `${side}Wrist`,
  target: 'up',
  // Children raise their arms in a V, well off vertical.
  tol: 40,
  weight: 0.5,
  hint: 'Reach right up to the sky!',
});

const armSideways = (side: 'left' | 'right'): PoseCheck[] => [
  {
    id: `${side}ArmLevel`,
    kind: 'direction',
    from: `${side}Shoulder`,
    to: `${side}Wrist`,
    target: 'horizontal',
    required: true,
    hint: 'Keep your arms out straight, like wings!',
  },
  {
    id: `${side}ArmOut`,
    kind: 'adx',
    a: `${side}Wrist`,
    b: 'shoulderMid',
    min: 0.75,
    required: true,
    hint: 'Stretch your arms out wide!',
  },
];

const HEAD: readonly PointRef[] = ['nose', 'leftEar', 'rightEar'];
const KNEES: readonly PointRef[] = ['leftKnee', 'rightKnee'];
const HIPS: readonly PointRef[] = ['leftHip', 'rightHip'];
const SHOULDERS: readonly PointRef[] = ['leftShoulder', 'rightShoulder'];

// ---------------------------------------------------------------------------
// The poses, keyed by catalog validatorName
// ---------------------------------------------------------------------------

export const POSE_CONFIGS: Readonly<Record<string, PoseSpec>> = {
  areHandsAboveShoulders: {
    checks: [wristUp('left'), armPointsUp('left')],
    notVisibleHint: 'Show your hands and shoulders to the camera!',
  },

  areBothHandsAboveShoulders: {
    checks: [wristUp('left'), wristUp('right'), armPointsUp('left'), armPointsUp('right')],
    notVisibleHint: 'Show both hands to the camera!',
  },

  isLeftHandRaised: {
    sideSpecific: true,
    checks: [
      wristUp('left'),
      {
        id: 'otherHandDown',
        kind: 'dy',
        a: 'rightWrist',
        b: 'rightShoulder',
        min: 0.05,
        tol: 0.25,
        hint: 'Just one hand — keep the other one down!',
      },
    ],
    notVisibleHint: 'Show your hand to the camera!',
  },

  isRightHandRaised: {
    sideSpecific: true,
    checks: [
      wristUp('right'),
      {
        id: 'otherHandDown',
        kind: 'dy',
        a: 'leftWrist',
        b: 'leftShoulder',
        min: 0.05,
        tol: 0.25,
        hint: 'Just one hand — keep the other one down!',
      },
    ],
    notVisibleHint: 'Show your hand to the camera!',
  },

  areHandsBelowHips: {
    checks: (['left', 'right'] as const).map((s) => ({
      id: `${s}HandDown`,
      kind: 'dy' as const,
      a: `${s}Wrist` as const,
      b: 'hipMid' as const,
      min: -0.05,
      tol: 0.3,
      hint: 'Put your hands down by your sides!',
    })),
    notVisibleHint: 'Let the camera see you!',
  },

  areArmsExtendedSideways: {
    checks: [...armSideways('left'), ...armSideways('right')],
    notVisibleHint: 'Stretch both arms out where the camera can see them!',
  },

  isHandNearHead: {
    checks: [
      { id: 'handOnHead', kind: 'dist', a: 'leftWrist', b: HEAD, max: 0.45, required: true, hint: 'Put a hand on your head!' },
      { id: 'handHigh', kind: 'dy', a: 'leftWrist', b: 'leftShoulder', max: -0.1, tol: 0.25, weight: 0.5, hint: 'Lift your hand up to your head!' },
    ],
    notVisibleHint: 'Show your hand and face to the camera!',
  },

  areHandsNearFace: {
    checks: [
      { id: 'leftOnFace', kind: 'dist', a: 'leftWrist', b: HEAD, max: 0.45, required: true, hint: 'Put both hands on your cheeks!' },
      { id: 'rightOnFace', kind: 'dist', a: 'rightWrist', b: HEAD, max: 0.45, required: true, hint: 'Both hands on your cheeks!' },
    ],
    notVisibleHint: 'Show both hands and your face!',
  },

  areHandsNearShoulders: {
    checks: [
      { id: 'handOnShoulder', kind: 'dist', a: 'leftWrist', b: SHOULDERS, max: 0.35, tol: 0.3, required: true, hint: 'Touch your shoulders!' },
    ],
    notVisibleHint: 'Show your hands and shoulders!',
  },

  isHandNearTorso: {
    checks: [
      { id: 'handOnTummy', kind: 'dist', a: 'leftWrist', b: 'belly', max: 0.3, tol: 0.3, required: true, hint: 'Put a hand on your tummy!' },
    ],
    notVisibleHint: 'Let the camera see your body!',
  },

  isHandNearKnees: {
    checks: [
      { id: 'handOnKnee', kind: 'dist', a: 'leftWrist', b: KNEES, max: 0.4, required: true, hint: 'Bend down and touch your knees!' },
    ],
    notVisibleHint: 'Step back so the camera can see your knees!',
  },

  areHandsNearAnkles: {
    checks: [
      { id: 'handOnToes', kind: 'dist', a: 'leftWrist', b: ['leftAnkle', 'rightAnkle'], max: 0.5, tol: 0.4, hint: 'Reach down to your toes!' },
      { id: 'handBelowKnee', kind: 'dy', a: 'leftWrist', b: 'kneeMid', min: 0, tol: 0.3, hint: 'Reach down lower!' },
    ],
    notVisibleHint: 'Step back so the camera can see your legs!',
  },

  areHandsNearHips: {
    checks: (['left', 'right'] as const).flatMap((s): PoseCheck[] => [
      { id: `${s}HandOnHip`, kind: 'dist', a: `${s}Wrist`, b: HIPS, max: 0.4, tol: 0.4, hint: 'Put your hands on your hips!' },
      { id: `${s}HandHipHeight`, kind: 'dy', a: `${s}Wrist`, b: 'hipMid', max: 0.2, tol: 0.25, weight: 0.5, hint: 'Hands up a little, on your hips!' },
      // What separates "hands on hips" from arms hanging by the sides.
      { id: `${s}ElbowBent`, kind: 'angle', a: `${s}Shoulder`, b: `${s}Elbow`, c: `${s}Wrist`, target: 95, tol: 40, hint: 'Bend your elbows out to the sides!' },
    ]),
    notVisibleHint: 'Let the camera see your hands and hips!',
  },

  areHandsTouching: {
    checks: [
      { id: 'handsTogether', kind: 'dist', a: 'leftWrist', b: 'rightWrist', max: 0.25, tol: 0.3, required: true, hint: 'Bring your hands together!' },
    ],
    notVisibleHint: 'Show both hands to the camera!',
  },

  isArmCrossedAcrossTorso: {
    checks: (['left', 'right'] as const).flatMap((s): PoseCheck[] => {
      const other = s === 'left' ? 'right' : 'left';
      return [
        { id: `${s}HandToOtherShoulder`, kind: 'dist', a: `${s}Wrist`, b: `${other}Shoulder`, max: 0.5, hint: 'Wrap your arms around yourself!' },
        { id: `${s}ArmCrossed`, kind: 'crossX', a: `${s}Wrist`, b: 'shoulderMid', toward: `${other}Shoulder`, min: 0.05, tol: 0.2, hint: 'Cross your arms over for a big hug!' },
      ];
    }),
    notVisibleHint: 'Show your arms and shoulders!',
  },

  areHandsForward: {
    checks: (['left', 'right'] as const).flatMap((s): PoseCheck[] => [
      // No depth: arms pointing at the camera look short in 2D, arms hanging do not.
      { id: `${s}ArmTowardCamera`, kind: 'dist', a: `${s}Wrist`, b: `${s}Shoulder`, max: 0.6, tol: 0.3, required: true, hint: 'Reach your hands out in front of you!' },
      { id: `${s}HandInFront`, kind: 'adx', a: `${s}Wrist`, b: 'shoulderMid', max: 0.5, tol: 0.3, hint: 'Hands in front of you!' },
      { id: `${s}HandBelowShoulder`, kind: 'dy', a: `${s}Wrist`, b: 'shoulderMid', min: 0.1, tol: 0.2, weight: 0.5, hint: 'Hold your hands at tummy height!' },
    ]),
    notVisibleHint: 'Show both hands to the camera!',
  },

  isSquatting: {
    checks: [
      { id: 'hipsDown', kind: 'dy', a: 'kneeMid', b: 'hipMid', max: 0.35, tol: 0.25, required: true, hint: 'Bend your knees and crouch down low!' },
    ],
    notVisibleHint: 'Step back so the camera can see your legs!',
  },

  isStandingUpright: {
    checks: [
      { id: 'torsoUpright', kind: 'direction', from: 'shoulderMid', to: 'hipMid', target: 'down', required: true, hint: 'Stand up nice and tall!' },
      { id: 'legsStraight', kind: 'dy', a: 'kneeMid', b: 'hipMid', min: 0.55, tol: 0.25, hint: 'Straighten your legs!' },
    ],
    notVisibleHint: 'Stand where the camera can see you!',
  },

  isStarPose: {
    checks: [
      ...armSideways('left'),
      ...armSideways('right'),
      { id: 'legsApart', kind: 'adx', a: 'leftAnkle', b: 'rightAnkle', min: 0.6, tol: 0.3, weight: 0.5, hint: 'Spread your legs wide like a star!' },
    ],
    notVisibleHint: 'Step back so the camera can see all of you!',
  },
};
