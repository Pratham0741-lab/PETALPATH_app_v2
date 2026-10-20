/**
 * Four versions of every config-scored pose:
 *   correct      — the pose as the mascot shows it
 *   sloppy       — key limbs rotated about 20° off
 *   halfVisible  — part of the body out of frame / low-confidence key landmarks
 *   wrong        — a clearly different pose
 * The first three must pass, the last must be rejected.
 */
import { ARMS_DOWN, LEGS_HIDDEN, rotate, type SkeletonSpec } from './poseFixtures';

export interface PoseCase {
  validator: string;
  correct: SkeletonSpec;
  sloppy: SkeletonSpec;
  halfVisible: SkeletonSpec;
  wrong: SkeletonSpec;
}

const UP_L = { upper: -100, lower: -95 };
const UP_R = { upper: -80, lower: -85 };
const SIDE_L = { upper: 180, lower: 180 };
const SIDE_R = { upper: 0, lower: 0 };
const HEAD_L = { upper: -120, lower: -30 };
const FACE_L = { upper: -115, lower: -20 };
const FACE_R = { upper: -65, lower: -160 };
const SHOULDER_L = { upper: 110, lower: -60 };
const TUMMY_L = { upper: 95, lower: 20 };
const HIP_L = { upper: 135, lower: 45 };
const HIP_R = { upper: 45, lower: 135 };
const CLAP_L = { upper: 70, lower: -70 };
const CLAP_R = { upper: 110, lower: 250 };
const HUG_L = { upper: 70, lower: -30 };
const HUG_R = { upper: 110, lower: 210 };
const FWD_L = { upper: 80, lower: 80 };
const FWD_R = { upper: 100, lower: 100 };
const LEG_OUT_L = { upper: 115, lower: 115 };
const LEG_OUT_R = { upper: 65, lower: 65 };

const both = (l: { upper: number; lower: number }, r: { upper: number; lower: number }) => ({ leftArm: l, rightArm: r });

export const POSE_CASES: PoseCase[] = [
  {
    validator: 'areHandsAboveShoulders',
    correct: { ...ARMS_DOWN, leftArm: UP_L },
    sloppy: { ...ARMS_DOWN, leftArm: rotate(UP_L, -20) },
    halfVisible: { ...ARMS_DOWN, leftArm: UP_L, visibility: { ...LEGS_HIDDEN, leftElbow: 0.35, leftWrist: 0.4 } },
    wrong: ARMS_DOWN,
  },
  {
    validator: 'areBothHandsAboveShoulders',
    correct: both(UP_L, UP_R),
    sloppy: both(rotate(UP_L, -20), rotate(UP_R, 20)),
    halfVisible: { ...both(UP_L, UP_R), visibility: { ...LEGS_HIDDEN, rightWrist: 0.35, rightElbow: 0.1 } },
    wrong: both(SIDE_L, SIDE_R),
  },
  {
    validator: 'isLeftHandRaised',
    correct: { ...ARMS_DOWN, leftArm: UP_L },
    sloppy: { ...ARMS_DOWN, leftArm: rotate(UP_L, -20) },
    halfVisible: { ...ARMS_DOWN, leftArm: UP_L, visibility: { ...LEGS_HIDDEN, rightWrist: 0.1 } },
    wrong: both(UP_L, UP_R),
  },
  {
    validator: 'isRightHandRaised',
    correct: { ...ARMS_DOWN, rightArm: UP_R },
    sloppy: { ...ARMS_DOWN, rightArm: rotate(UP_R, 20) },
    halfVisible: { ...ARMS_DOWN, rightArm: UP_R, visibility: { ...LEGS_HIDDEN, leftWrist: 0.1 } },
    wrong: both(UP_L, UP_R),
  },
  {
    validator: 'areHandsBelowHips',
    correct: ARMS_DOWN,
    sloppy: both(rotate(ARMS_DOWN.leftArm, 20), rotate(ARMS_DOWN.rightArm, -20)),
    halfVisible: { ...ARMS_DOWN, visibility: { leftKnee: 0.05, rightKnee: 0.05, leftAnkle: 0.02, rightAnkle: 0.02, rightWrist: 0.1 } },
    wrong: both(UP_L, UP_R),
  },
  {
    validator: 'areArmsExtendedSideways',
    correct: both(SIDE_L, SIDE_R),
    sloppy: both(rotate(SIDE_L, -20), rotate(SIDE_R, 20)),
    halfVisible: { ...both(SIDE_L, SIDE_R), visibility: { ...LEGS_HIDDEN, leftWrist: 0.35, rightElbow: 0.2 } },
    wrong: ARMS_DOWN,
  },
  {
    validator: 'isHandNearHead',
    correct: { ...ARMS_DOWN, leftArm: HEAD_L },
    sloppy: { ...ARMS_DOWN, leftArm: rotate(HEAD_L, -20) },
    halfVisible: { ...ARMS_DOWN, leftArm: HEAD_L, visibility: { ...LEGS_HIDDEN, nose: 0.2, rightEar: 0.1 } },
    wrong: ARMS_DOWN,
  },
  {
    validator: 'areHandsNearFace',
    correct: both(FACE_L, FACE_R),
    sloppy: both(rotate(FACE_L, -20), rotate(FACE_R, 20)),
    halfVisible: { ...both(FACE_L, FACE_R), visibility: { ...LEGS_HIDDEN, nose: 0.1, leftEar: 0.35 } },
    wrong: both(SIDE_L, SIDE_R),
  },
  {
    validator: 'areHandsNearShoulders',
    correct: { ...ARMS_DOWN, leftArm: SHOULDER_L },
    sloppy: { ...ARMS_DOWN, leftArm: rotate(SHOULDER_L, 20) },
    halfVisible: { ...ARMS_DOWN, leftArm: SHOULDER_L, visibility: { ...LEGS_HIDDEN, rightShoulder: 0.2 } },
    wrong: both(UP_L, UP_R),
  },
  {
    validator: 'isHandNearTorso',
    correct: { ...ARMS_DOWN, leftArm: TUMMY_L },
    sloppy: { ...ARMS_DOWN, leftArm: rotate(TUMMY_L, -20) },
    halfVisible: { ...ARMS_DOWN, leftArm: TUMMY_L, visibility: { leftKnee: 0.05, rightKnee: 0.05, leftAnkle: 0.02, rightAnkle: 0.02, rightHip: 0.35, rightShoulder: 0.1 } },
    wrong: both(UP_L, UP_R),
  },
  {
    validator: 'isHandNearKnees',
    correct: { ...ARMS_DOWN, leftArm: { upper: 100, lower: 95 }, torso: 0.22, hipDrop: 0.25 },
    sloppy: { ...ARMS_DOWN, leftArm: { upper: 120, lower: 115 }, torso: 0.22, hipDrop: 0.25 },
    halfVisible: { ...ARMS_DOWN, leftArm: { upper: 100, lower: 95 }, torso: 0.22, hipDrop: 0.25, visibility: { leftAnkle: 0.02, rightAnkle: 0.02, rightKnee: 0.1, nose: 0.1 } },
    wrong: both(UP_L, UP_R),
  },
  {
    validator: 'areHandsNearAnkles',
    // Bent right over: the torso nearly vanishes on screen.
    correct: { ...ARMS_DOWN, leftArm: { upper: 95, lower: 90 }, torso: 0.2, bend: 0.9, hipDrop: 0.2 },
    sloppy: { ...ARMS_DOWN, leftArm: { upper: 115, lower: 110 }, torso: 0.2, bend: 0.9, hipDrop: 0.2 },
    halfVisible: { ...ARMS_DOWN, leftArm: { upper: 95, lower: 90 }, torso: 0.2, bend: 0.9, hipDrop: 0.2, visibility: { leftAnkle: 0.05, rightAnkle: 0.05 } },
    wrong: both(UP_L, UP_R),
  },
  {
    validator: 'areHandsNearHips',
    correct: both(HIP_L, HIP_R),
    sloppy: both(rotate(HIP_L, 20), rotate(HIP_R, -20)),
    halfVisible: { ...both(HIP_L, HIP_R), visibility: { leftKnee: 0.05, rightKnee: 0.05, leftAnkle: 0.02, rightAnkle: 0.02, rightWrist: 0.1, rightElbow: 0.1 } },
    wrong: ARMS_DOWN,
  },
  {
    validator: 'areHandsTouching',
    correct: both(CLAP_L, CLAP_R),
    sloppy: both(rotate(CLAP_L, -20), rotate(CLAP_R, 20)),
    halfVisible: { ...both(CLAP_L, CLAP_R), visibility: { ...LEGS_HIDDEN, leftElbow: 0.1, rightWrist: 0.35 } },
    wrong: both(SIDE_L, SIDE_R),
  },
  {
    validator: 'isArmCrossedAcrossTorso',
    correct: both(HUG_L, HUG_R),
    sloppy: both(rotate(HUG_L, 20), rotate(HUG_R, -20)),
    halfVisible: { ...both(HUG_L, HUG_R), visibility: { ...LEGS_HIDDEN, rightWrist: 0.1 } },
    wrong: ARMS_DOWN,
  },
  {
    validator: 'areHandsForward',
    // Pointing at the camera: the arms look ~40% of their length on screen.
    correct: { ...both(FWD_L, FWD_R), armLength: 0.4 },
    sloppy: { ...both(rotate(FWD_L, 20), rotate(FWD_R, -20)), armLength: 0.45 },
    halfVisible: { ...both(FWD_L, FWD_R), armLength: 0.4, visibility: { ...LEGS_HIDDEN, leftElbow: 0.1, rightElbow: 0.1 } },
    wrong: ARMS_DOWN,
  },
  {
    validator: 'isSquatting',
    correct: { ...ARMS_DOWN, hipDrop: 0.4 },
    sloppy: { ...ARMS_DOWN, hipDrop: 0.3, leftLeg: { upper: 110, lower: 80 }, rightLeg: { upper: 70, lower: 100 } },
    halfVisible: { ...ARMS_DOWN, hipDrop: 0.4, visibility: { leftAnkle: 0.02, rightAnkle: 0.02, rightKnee: 0.1, leftWrist: 0.1, rightWrist: 0.1 } },
    wrong: ARMS_DOWN,
  },
  {
    validator: 'isStandingUpright',
    correct: ARMS_DOWN,
    sloppy: { ...ARMS_DOWN, leftLeg: { upper: 110, lower: 90 }, rightLeg: { upper: 70, lower: 90 } },
    halfVisible: { ...ARMS_DOWN, visibility: LEGS_HIDDEN },
    wrong: { ...ARMS_DOWN, hipDrop: 0.45 },
  },
  {
    validator: 'isStarPose',
    correct: { ...both(SIDE_L, SIDE_R), leftLeg: LEG_OUT_L, rightLeg: LEG_OUT_R },
    sloppy: { ...both(rotate(SIDE_L, -20), rotate(SIDE_R, 20)), leftLeg: rotate(LEG_OUT_L, -10), rightLeg: rotate(LEG_OUT_R, 10) },
    halfVisible: { ...both(SIDE_L, SIDE_R), visibility: { leftKnee: 0.05, rightKnee: 0.05, leftAnkle: 0.02, rightAnkle: 0.02, rightWrist: 0.35 } },
    wrong: ARMS_DOWN,
  },
];
