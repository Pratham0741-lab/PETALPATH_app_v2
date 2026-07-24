import { PoseFrame, ValidationResult } from '../types/pose.types';
import { CAMERA_CONFIG } from '../config/camera.config';

function isLandmarkValid(pt: { visibility?: number }): boolean {
  return (pt.visibility ?? 0) >= CAMERA_CONFIG.MIN_LANDMARK_CONFIDENCE;
}

function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function getShoulderWidth(pose: PoseFrame): number {
  const { leftShoulder, rightShoulder } = pose.landmarks;
  if (!isLandmarkValid(leftShoulder) || !isLandmarkValid(rightShoulder)) {
    return 0.2; // Default fallback width
  }
  return Math.max(dist(leftShoulder, rightShoulder), 0.05);
}

/**
 * Primitive 1: Hands Above Shoulders
 */
export function areHandsAboveShoulders(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;

  if (
    !isLandmarkValid(leftWrist) ||
    !isLandmarkValid(rightWrist) ||
    !isLandmarkValid(leftShoulder) ||
    !isLandmarkValid(rightShoulder)
  ) {
    return { detected: false, confidence: 0, primitiveName: 'hands_above_shoulders' };
  }

  // In normalized screen coords, smaller y means higher on screen
  const leftAbove = leftWrist.y < leftShoulder.y;
  const rightAbove = rightWrist.y < rightShoulder.y;

  if (leftAbove && rightAbove) {
    return { detected: true, confidence: 0.95, primitiveName: 'hands_above_shoulders' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hands_above_shoulders' };
}

/**
 * Primitive 2: Hand Near Head
 */
export function isHandNearHead(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, nose, leftEar, rightEar } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 0.85 * sw;

  if (!isLandmarkValid(nose)) {
    return { detected: false, confidence: 0, primitiveName: 'hand_near_head' };
  }

  const leftNearNose = isLandmarkValid(leftWrist) && dist(leftWrist, nose) < maxDist;
  const rightNearNose = isLandmarkValid(rightWrist) && dist(rightWrist, nose) < maxDist;
  const leftNearEar = isLandmarkValid(leftWrist) && isLandmarkValid(leftEar) && dist(leftWrist, leftEar) < maxDist;
  const rightNearEar = isLandmarkValid(rightWrist) && isLandmarkValid(rightEar) && dist(rightWrist, rightEar) < maxDist;

  if (leftNearNose || rightNearNose || leftNearEar || rightNearEar) {
    return { detected: true, confidence: 0.9, primitiveName: 'hand_near_head' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hand_near_head' };
}

/**
 * Primitive 3: Hand Near Knees
 */
export function isHandNearKnees(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftKnee, rightKnee } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 0.85 * sw;

  const leftNearLeftKnee = isLandmarkValid(leftWrist) && isLandmarkValid(leftKnee) && dist(leftWrist, leftKnee) < maxDist;
  const rightNearRightKnee = isLandmarkValid(rightWrist) && isLandmarkValid(rightKnee) && dist(rightWrist, rightKnee) < maxDist;
  const crossLeftKnee = isLandmarkValid(rightWrist) && isLandmarkValid(leftKnee) && dist(rightWrist, leftKnee) < maxDist;
  const crossRightKnee = isLandmarkValid(leftWrist) && isLandmarkValid(rightKnee) && dist(leftWrist, rightKnee) < maxDist;

  if (leftNearLeftKnee || rightNearRightKnee || crossLeftKnee || crossRightKnee) {
    return { detected: true, confidence: 0.9, primitiveName: 'hand_near_knees' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hand_near_knees' };
}

/**
 * Primitive 4: Hands Near Hips
 */
export function areHandsNearHips(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftHip, rightHip } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 0.7 * sw;

  if (!isLandmarkValid(leftHip) || !isLandmarkValid(rightHip)) {
    return { detected: false, confidence: 0, primitiveName: 'hands_near_hips' };
  }

  const leftValid = isLandmarkValid(leftWrist) && dist(leftWrist, leftHip) < maxDist;
  const rightValid = isLandmarkValid(rightWrist) && dist(rightWrist, rightHip) < maxDist;

  if (leftValid && rightValid) {
    return { detected: true, confidence: 0.9, primitiveName: 'hands_near_hips' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hands_near_hips' };
}

/**
 * Primitive 5: Hands Touching (Clap)
 */
export function areHandsTouching(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 0.5 * sw;

  if (!isLandmarkValid(leftWrist) || !isLandmarkValid(rightWrist)) {
    return { detected: false, confidence: 0, primitiveName: 'hands_touching' };
  }

  if (dist(leftWrist, rightWrist) < maxDist) {
    return { detected: true, confidence: 0.92, primitiveName: 'hands_touching' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hands_touching' };
}

/**
 * Primitive 6: Arms Crossed Across Torso (Hug Yourself - Experimental)
 */
export function isArmCrossedAcrossTorso(pose: PoseFrame): ValidationResult {
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = pose.landmarks;
  const sw = getShoulderWidth(pose);
  const maxDist = 0.95 * sw;

  if (
    !isLandmarkValid(leftWrist) ||
    !isLandmarkValid(rightWrist) ||
    !isLandmarkValid(leftShoulder) ||
    !isLandmarkValid(rightShoulder)
  ) {
    return { detected: false, confidence: 0, primitiveName: 'arms_crossed_torso' };
  }

  // Left wrist near right shoulder area & right wrist near left shoulder area
  const leftCrossed = dist(leftWrist, rightShoulder) < maxDist;
  const rightCrossed = dist(rightWrist, leftShoulder) < maxDist;

  if (leftCrossed && rightCrossed) {
    // Experimental lower threshold acceptance
    return { detected: true, confidence: 0.75, primitiveName: 'arms_crossed_torso' };
  }

  return { detected: false, confidence: 0, primitiveName: 'arms_crossed_torso' };
}

/**
 * Primitive 7: Hand Moving Horizontally (Wave)
 */
export function isHandMovingHorizontally(history: PoseFrame[]): ValidationResult {
  if (!history || history.length < 5) {
    return { detected: false, confidence: 0, primitiveName: 'hand_moving_horizontally' };
  }

  const latest = history[history.length - 1];
  const { leftWrist, rightWrist, leftShoulder, rightShoulder } = latest.landmarks;

  // Check if at least one wrist is raised above shoulder level
  const leftRaised = isLandmarkValid(leftWrist) && isLandmarkValid(leftShoulder) && leftWrist.y < leftShoulder.y;
  const rightRaised = isLandmarkValid(rightWrist) && isLandmarkValid(rightShoulder) && rightWrist.y < rightShoulder.y;

  if (!leftRaised && !rightRaised) {
    return { detected: false, confidence: 0, primitiveName: 'hand_moving_horizontally' };
  }

  // Measure direction changes in wrist X coordinate across historical window
  const activeWristKey = rightRaised ? 'rightWrist' : 'leftWrist';
  let directionChanges = 0;
  let lastDirection = 0; // 1 for right, -1 for left

  for (let i = 1; i < history.length; i++) {
    const prevX = history[i - 1].landmarks[activeWristKey].x;
    const currX = history[i].landmarks[activeWristKey].x;
    const diff = currX - prevX;

    if (Math.abs(diff) > 0.015) {
      const currentDirection = Math.sign(diff);
      if (lastDirection !== 0 && currentDirection !== lastDirection) {
        directionChanges += 1;
      }
      lastDirection = currentDirection;
    }
  }

  if (directionChanges >= 2) {
    return { detected: true, confidence: 0.88, primitiveName: 'hand_moving_horizontally' };
  }

  return { detected: false, confidence: 0, primitiveName: 'hand_moving_horizontally' };
}

/**
 * Primitive 8: Body Moving Vertically (Jump)
 * Detects rapid vertical displacement of hips/torso midpoint followed by downward return.
 */
export function isBodyMovingVertically(history: PoseFrame[]): ValidationResult {
  if (!history || history.length < 6) {
    return { detected: false, confidence: 0, primitiveName: 'body_moving_vertically' };
  }

  const latest = history[history.length - 1];
  const sw = getShoulderWidth(latest);

  const getTorsoCenterY = (frame: PoseFrame): number | null => {
    const { leftShoulder, rightShoulder, leftHip, rightHip } = frame.landmarks;
    if (isLandmarkValid(leftShoulder) && isLandmarkValid(rightShoulder)) {
      return (leftShoulder.y + rightShoulder.y) / 2;
    }
    if (isLandmarkValid(leftHip) && isLandmarkValid(rightHip)) {
      return (leftHip.y + rightHip.y) / 2;
    }
    return null;
  };

  const centers = history
    .map(getTorsoCenterY)
    .filter((y): y is number => y !== null);

  if (centers.length < 5) {
    return { detected: false, confidence: 0, primitiveName: 'body_moving_vertically' };
  }

  const minY = Math.min(...centers); // Peak height in screen coordinates
  const initialY = centers[0];
  const currentY = centers[centers.length - 1];

  const peakDisplacement = initialY - minY;
  const requiredDisplacement = 0.25 * sw;

  // Peak must be significantly higher than initial, and current position returning back
  if (peakDisplacement >= requiredDisplacement && (currentY - minY) >= 0.1 * sw) {
    return { detected: true, confidence: 0.85, primitiveName: 'body_moving_vertically' };
  }

  return { detected: false, confidence: 0, primitiveName: 'body_moving_vertically' };
}
