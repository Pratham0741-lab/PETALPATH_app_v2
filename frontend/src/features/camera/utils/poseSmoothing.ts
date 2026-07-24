import { Point3D, PoseLandmarks } from '../types/pose.types';
import { CAMERA_CONFIG } from '../config/camera.config';

function smoothPoint(
  current: Point3D,
  previous?: Point3D,
  alpha = CAMERA_CONFIG.POSE_SMOOTHING_ALPHA,
): Point3D {
  if (!previous) return { ...current };

  return {
    x: alpha * current.x + (1 - alpha) * previous.x,
    y: alpha * current.y + (1 - alpha) * previous.y,
    z: alpha * current.z + (1 - alpha) * previous.z,
    visibility:
      current.visibility !== undefined && previous.visibility !== undefined
        ? alpha * current.visibility + (1 - alpha) * previous.visibility
        : current.visibility,
  };
}

export function smoothLandmarks(
  current: PoseLandmarks,
  previous: PoseLandmarks | null,
  alpha = CAMERA_CONFIG.POSE_SMOOTHING_ALPHA,
): PoseLandmarks {
  if (!previous) return { ...current };

  const rawLandmarks = current.rawLandmarks.map((pt, i) =>
    smoothPoint(pt, previous.rawLandmarks[i], alpha),
  );

  return {
    nose: smoothPoint(current.nose, previous.nose, alpha),
    leftEye: smoothPoint(current.leftEye, previous.leftEye, alpha),
    rightEye: smoothPoint(current.rightEye, previous.rightEye, alpha),
    leftEar: smoothPoint(current.leftEar, previous.leftEar, alpha),
    rightEar: smoothPoint(current.rightEar, previous.rightEar, alpha),
    leftShoulder: smoothPoint(current.leftShoulder, previous.leftShoulder, alpha),
    rightShoulder: smoothPoint(current.rightShoulder, previous.rightShoulder, alpha),
    leftElbow: smoothPoint(current.leftElbow, previous.leftElbow, alpha),
    rightElbow: smoothPoint(current.rightElbow, previous.rightElbow, alpha),
    leftWrist: smoothPoint(current.leftWrist, previous.leftWrist, alpha),
    rightWrist: smoothPoint(current.rightWrist, previous.rightWrist, alpha),
    leftHip: smoothPoint(current.leftHip, previous.leftHip, alpha),
    rightHip: smoothPoint(current.rightHip, previous.rightHip, alpha),
    leftKnee: smoothPoint(current.leftKnee, previous.leftKnee, alpha),
    rightKnee: smoothPoint(current.rightKnee, previous.rightKnee, alpha),
    leftAnkle: smoothPoint(current.leftAnkle, previous.leftAnkle, alpha),
    rightAnkle: smoothPoint(current.rightAnkle, previous.rightAnkle, alpha),
    rawLandmarks,
  };
}
