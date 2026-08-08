import { PoseFrameV1, PoseKeypoint } from '../CameraTypes';
import { PoseFrame, PoseLandmarks, Point3D } from '../../features/camera/types/pose.types';

export interface ActivityPoseFrameV1 {
  version: 1;
  poseFrame: PoseFrame;
  feedbackKey: string;
  feedbackText: string;
  qualityScore: number;
  stabilityScore: number;
  trackingState: string;
}

export const FEEDBACK_MESSAGES: Record<string, string> = {

  'feedback.searching': 'Stand in front of the camera to start!',
  'feedback.move_back': 'Step back so the camera can see your whole body!',
  'feedback.low_visibility': 'Make sure your arms and body are clearly visible!',
  'feedback.low_confidence': 'Position yourself clearly in front of the camera!',
  'feedback.calibration_pending': 'Hold still while we get ready...',
  'feedback.ready': 'Get ready to move!',
};

export class CameraActivityAdapter {

  public static adaptToActivityPoseFrame(frameV1: PoseFrameV1 | null): ActivityPoseFrameV1 | null {
    if (!frameV1 || !frameV1.keypoints || frameV1.keypoints.length === 0) {
      return null;
    }

    const keypointMap = new Map<number, PoseKeypoint>();
    frameV1.keypoints.forEach((kp) => keypointMap.set(kp.index, kp));

    const getPt = (idx: number): Point3D => {
      const kp = keypointMap.get(idx);
      if (!kp) return { x: 0, y: 0, z: 0, visibility: 0 };
      return {
        x: kp.x,
        y: kp.y,
        z: 0,
        visibility: kp.score,
      };
    };

    const nose = getPt(0);
    const leftEye = getPt(1);
    const rightEye = getPt(2);
    const leftEar = getPt(3);
    const rightEar = getPt(4);
    const leftShoulder = getPt(5);
    const rightShoulder = getPt(6);
    const leftElbow = getPt(7);
    const rightElbow = getPt(8);
    const leftWrist = getPt(9);
    const rightWrist = getPt(10);
    const leftHip = getPt(11);
    const rightHip = getPt(12);
    const leftKnee = getPt(13);
    const rightKnee = getPt(14);
    const leftAnkle = getPt(15);
    const rightAnkle = getPt(16);

    const rawLandmarks: Point3D[] = new Array(33).fill({ x: 0, y: 0, z: 0, visibility: 0 });
    rawLandmarks[0] = nose;
    rawLandmarks[2] = leftEye;
    rawLandmarks[5] = rightEye;
    rawLandmarks[7] = leftEar;
    rawLandmarks[8] = rightEar;
    rawLandmarks[11] = leftShoulder;
    rawLandmarks[12] = rightShoulder;
    rawLandmarks[13] = leftElbow;
    rawLandmarks[14] = rightElbow;
    rawLandmarks[15] = leftWrist;
    rawLandmarks[16] = rightWrist;
    rawLandmarks[23] = leftHip;
    rawLandmarks[24] = rightHip;
    rawLandmarks[25] = leftKnee;
    rawLandmarks[26] = rightKnee;
    rawLandmarks[27] = leftAnkle;
    rawLandmarks[28] = rightAnkle;

    const landmarks: PoseLandmarks = {
      nose,
      leftEye,
      rightEye,
      leftEar,
      rightEar,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
      rawLandmarks,
    };

    const poseFrame: PoseFrame = {
      landmarks,
      timestamp: frameV1.timestamp,
      confidence: frameV1.confidence,
    };

    const feedbackKey = this.resolveFeedbackKey(frameV1);
    const feedbackText = FEEDBACK_MESSAGES[feedbackKey] || FEEDBACK_MESSAGES['feedback.ready'];

    return {
      version: 1,
      poseFrame,
      feedbackKey,
      feedbackText,
      qualityScore: frameV1.qualityScore,
      stabilityScore: frameV1.stabilityScore,
      trackingState: frameV1.trackingState,
    };
  }

  private static resolveFeedbackKey(frameV1: PoseFrameV1): string {
    if (frameV1.trackingState === 'SEARCHING') {
      return 'feedback.searching';
    }
    if (frameV1.trackingState === 'LOST' || frameV1.trackingState === 'RECOVERING') {
      return 'feedback.move_back';
    }
    if (frameV1.errorCode === 'LOW_VISIBILITY') {
      return 'feedback.low_visibility';
    }
    if (frameV1.errorCode === 'LOW_CONFIDENCE') {
      return 'feedback.low_confidence';
    }
    if (frameV1.errorCode === 'CALIBRATION_PENDING') {
      return 'feedback.calibration_pending';
    }
    return 'feedback.ready';
  }
}
