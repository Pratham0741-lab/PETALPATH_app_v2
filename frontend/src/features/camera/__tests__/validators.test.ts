import { Point3D, PoseFrame, PoseLandmarks } from '../types/pose.types';
import {
  areHandsAboveShoulders,
  isHandNearHead,
  isHandNearKnees,
  areHandsNearHips,
  areHandsTouching,
} from '../validators/primitives';

export function createMockPose(overrides: Partial<Record<keyof Omit<PoseLandmarks, 'rawLandmarks'>, Point3D>> = {}): PoseFrame {
  const defaultPt = (x: number, y: number): Point3D => ({ x, y, z: 0, visibility: 0.9 });

  const rawPoints: Point3D[] = Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });

  const landmarks: PoseLandmarks = {
    nose: overrides.nose || defaultPt(0.5, 0.2),
    leftEye: overrides.leftEye || defaultPt(0.48, 0.18),
    rightEye: overrides.rightEye || defaultPt(0.52, 0.18),
    leftEar: overrides.leftEar || defaultPt(0.45, 0.18),
    rightEar: overrides.rightEar || defaultPt(0.55, 0.18),
    leftShoulder: overrides.leftShoulder || defaultPt(0.4, 0.4),
    rightShoulder: overrides.rightShoulder || defaultPt(0.6, 0.4),
    leftElbow: overrides.leftElbow || defaultPt(0.35, 0.55),
    rightElbow: overrides.rightElbow || defaultPt(0.65, 0.55),
    leftWrist: overrides.leftWrist || defaultPt(0.35, 0.7),
    rightWrist: overrides.rightWrist || defaultPt(0.65, 0.7),
    leftHip: overrides.leftHip || defaultPt(0.42, 0.7),
    rightHip: overrides.rightHip || defaultPt(0.58, 0.7),
    leftKnee: overrides.leftKnee || defaultPt(0.42, 0.85),
    rightKnee: overrides.rightKnee || defaultPt(0.58, 0.85),
    leftAnkle: overrides.leftAnkle || defaultPt(0.42, 0.98),
    rightAnkle: overrides.rightAnkle || defaultPt(0.58, 0.98),
    rawLandmarks: rawPoints,
  };

  return {
    landmarks,
    timestamp: Date.now(),
    confidence: 0.9,
  };
}

export function runPrimitiveValidatorVerification(): boolean {
  // Test 1: Hands Above Shoulders
  const handsUpPose = createMockPose({
    leftWrist: { x: 0.4, y: 0.2, z: 0, visibility: 0.9 },
    rightWrist: { x: 0.6, y: 0.2, z: 0, visibility: 0.9 },
  });
  const res1 = areHandsAboveShoulders(handsUpPose);
  if (!res1.detected) return false;

  // Test 2: Low confidence landmark filtering
  const lowConfPose = createMockPose({
    leftWrist: { x: 0.4, y: 0.2, z: 0, visibility: 0.2 },
    rightWrist: { x: 0.6, y: 0.2, z: 0, visibility: 0.9 },
  });
  const res2 = areHandsAboveShoulders(lowConfPose);
  if (res2.detected) return false;

  // Test 3: Hand Near Head
  const headTouchPose = createMockPose({
    leftWrist: { x: 0.51, y: 0.21, z: 0, visibility: 0.9 },
  });
  const res3 = isHandNearHead(headTouchPose);
  if (!res3.detected) return false;

  // Test 4: Hand Near Knees
  const kneeTouchPose = createMockPose({
    leftWrist: { x: 0.42, y: 0.84, z: 0, visibility: 0.9 },
  });
  const res4 = isHandNearKnees(kneeTouchPose);
  if (!res4.detected) return false;

  // Test 5: Hands Near Hips
  const hipsPose = createMockPose({
    leftWrist: { x: 0.42, y: 0.71, z: 0, visibility: 0.9 },
    rightWrist: { x: 0.58, y: 0.71, z: 0, visibility: 0.9 },
  });
  const res5 = areHandsNearHips(hipsPose);
  if (!res5.detected) return false;

  // Test 6: Clap
  const clapPose = createMockPose({
    leftWrist: { x: 0.5, y: 0.5, z: 0, visibility: 0.9 },
    rightWrist: { x: 0.51, y: 0.5, z: 0, visibility: 0.9 },
  });
  const res6 = areHandsTouching(clapPose);
  if (!res6.detected) return false;

  return true;
}
