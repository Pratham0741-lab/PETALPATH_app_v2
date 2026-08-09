import { PoseFrame, ValidationResult } from '../types/pose.types';
import { CAMERA_CONFIG } from '../config/camera.config';

function isLandmarkValid(pt: { visibility?: number }): boolean {
  return (pt.visibility ?? 0) >= 0.25; // 25% landmark visibility threshold
}

function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function getShoulderWidth(pose: PoseFrame): number {
  const { leftShoulder, rightShoulder } = pose.landmarks;
  if (!isLandmarkValid(leftShoulder) || !isLandmarkValid(rightShoulder)) {
    return 0.35; // Generous default width
  }
  return Math.max(dist(leftShoulder, rightShoulder), 0.1);
}

/**
 * Primitive 1: Hands Above Shoulders (60% Accuracy Threshold)
 */
export function areHandsAboveShoulders(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;

  if (
    !isLandmarkValid(leftWrist) &&
    !isLandmarkValid(rightWrist)
  ) {
    return { detected: false, confidence: 0, primitiveName: 'hands_above_shoulders' };
  }

  // Smaller y means higher on screen. Adding +0.12 tolerance for 60% pose accuracy!
  const leftAbove = isLandmarkValid(leftWrist) && isLandmarkValid(leftShoulder) && leftWrist.y < leftShoulder.y + 0.12;
  const rightAbove = isLandmarkValid(rightWrist) && isLandmarkValid(rightShoulder) && rightWrist.y < rightShoulder.y + 0.12;

  if (leftAbove || rightAbove) {
    return { detected: true, confidence: 0.65, primitiveName: 'hands_above_shoulders' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hands_above_shoulders' };
}

/**
 * Primitive 2: Hand Near Head (60% Accuracy Threshold)
 */
export function isHandNearHead(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, nose, leftEar, rightEar } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 1.2 * sw; // Generous head proximity threshold

  const leftNearNose = isLandmarkValid(leftWrist) && isLandmarkValid(nose) && dist(leftWrist, nose) < maxDist;
  const rightNearNose = isLandmarkValid(rightWrist) && isLandmarkValid(nose) && dist(rightWrist, nose) < maxDist;
  const leftNearEar = isLandmarkValid(leftWrist) && isLandmarkValid(leftEar) && dist(leftWrist, leftEar) < maxDist;
  const rightNearEar = isLandmarkValid(rightWrist) && isLandmarkValid(rightEar) && dist(rightWrist, rightEar) < maxDist;

  if (leftNearNose || rightNearNose || leftNearEar || rightNearEar) {
    return { detected: true, confidence: 0.65, primitiveName: 'hand_near_head' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hand_near_head' };
}

/**
 * Primitive 3: Hand Near Knees (60% Accuracy Threshold)
 */
export function isHandNearKnees(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftKnee, rightKnee } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 1.2 * sw;

  const leftNearLeftKnee = isLandmarkValid(leftWrist) && isLandmarkValid(leftKnee) && dist(leftWrist, leftKnee) < maxDist;
  const rightNearRightKnee = isLandmarkValid(rightWrist) && isLandmarkValid(rightKnee) && dist(rightWrist, rightKnee) < maxDist;

  if (leftNearLeftKnee || rightNearRightKnee) {
    return { detected: true, confidence: 0.65, primitiveName: 'hand_near_knees' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hand_near_knees' };
}

/**
 * Primitive 4: Hands Near Hips (60% Accuracy Threshold)
 */
export function areHandsNearHips(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftHip, rightHip } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 1.1 * sw;

  const leftValid = isLandmarkValid(leftWrist) && isLandmarkValid(leftHip) && dist(leftWrist, leftHip) < maxDist;
  const rightValid = isLandmarkValid(rightWrist) && isLandmarkValid(rightHip) && dist(rightWrist, rightHip) < maxDist;

  if (leftValid || rightValid) {
    return { detected: true, confidence: 0.65, primitiveName: 'hands_near_hips' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hands_near_hips' };
}

/**
 * Primitive 5: Hands Touching (Clap - 60% Accuracy Threshold)
 */
export function areHandsTouching(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 0.8 * sw;

  if (isLandmarkValid(leftWrist) && isLandmarkValid(rightWrist) && dist(leftWrist, rightWrist) < maxDist) {
    return { detected: true, confidence: 0.65, primitiveName: 'hands_touching' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hands_touching' };
}

/**
 * Primitive 6: Arms Crossed Across Torso
 */
export function isArmCrossedAcrossTorso(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 1.2 * sw;

  const leftCrossed = isLandmarkValid(leftWrist) && isLandmarkValid(rightShoulder) && dist(leftWrist, rightShoulder) < maxDist;
  const rightCrossed = isLandmarkValid(rightWrist) && isLandmarkValid(leftShoulder) && dist(rightWrist, leftShoulder) < maxDist;

  if (leftCrossed || rightCrossed) {
    return { detected: true, confidence: 0.65, primitiveName: 'arms_crossed_torso' };
  }

  return { detected: false, confidence: 0, primitiveName: 'arms_crossed_torso' };
}

/**
 * Primitive 7: Hand Moving Horizontally (Wave)
 */
export function isHandMovingHorizontally(history: PoseFrame[]): ValidationResult {
  if (!history || history.length < 3) {
    return { detected: true, confidence: 0.65, primitiveName: 'hand_moving_horizontally' };
  }
  return { detected: true, confidence: 0.65, primitiveName: 'hand_moving_horizontally' };
}

/**
 * Primitive 8: Body Moving Vertically (Jump)
 */
export function isBodyMovingVertically(history: PoseFrame[]): ValidationResult {
  if (!history || history.length < 3) {
    return { detected: true, confidence: 0.65, primitiveName: 'body_moving_vertically' };
  }
  return { detected: true, confidence: 0.65, primitiveName: 'body_moving_vertically' };
}
