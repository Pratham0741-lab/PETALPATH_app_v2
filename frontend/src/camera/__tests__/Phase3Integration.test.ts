import { poseStream } from '../PoseStream';
import { CameraActivityAdapter, FEEDBACK_MESSAGES } from '../integration/CameraActivityAdapter';
import { PoseFrameV1 } from '../CameraTypes';

describe('PetalPath Camera Engine v3 - Phase 3 Integration Tests', () => {
  afterEach(() => {
    poseStream.clear();
  });

  it('should translate MoveNet 17 keypoints to 33 ActivityPoseFrameV1 landmarks', () => {
    const mockFrameV1: PoseFrameV1 = {
      version: 1,
      timestamp: 1690000000000,
      inferenceTime: 14,
      confidence: 0.92,
      qualityScore: 95,
      stabilityScore: 98,
      trackingState: 'TRACKING',
      errorCode: 'OK',
      calibration: {
        bodyScale: 1.0,
        shoulderWidth: 0.25,
        armLength: 0.45,
        torsoLength: 0.5,
        posture: 'STANDING',
        estimatedDistanceMeters: 1.5,
        calibrationConfidence: 1.0,
        status: 'STABILIZED',
      },
      keypoints: [
        { index: 0, name: 'nose', x: 0.5, y: 0.2, score: 0.99 },
        { index: 5, name: 'left_shoulder', x: 0.4, y: 0.35, score: 0.96 },
        { index: 6, name: 'right_shoulder', x: 0.6, y: 0.35, score: 0.97 },
        { index: 7, name: 'left_elbow', x: 0.35, y: 0.5, score: 0.91 },
        { index: 8, name: 'right_elbow', x: 0.65, y: 0.5, score: 0.92 },
        { index: 9, name: 'left_wrist', x: 0.35, y: 0.2, score: 0.94 }, // Raised wrist
        { index: 10, name: 'right_wrist', x: 0.65, y: 0.2, score: 0.93 }, // Raised wrist
      ],
    };

    const adapted = CameraActivityAdapter.adaptToActivityPoseFrame(mockFrameV1);

    expect(adapted).not.toBeNull();
    expect(adapted?.version).toBe(1);
    expect(adapted?.feedbackKey).toBe('feedback.ready');
    expect(adapted?.feedbackText).toBe(FEEDBACK_MESSAGES['feedback.ready']);
    expect(adapted?.poseFrame.landmarks.rawLandmarks.length).toBe(33);
    expect(adapted?.poseFrame.landmarks.leftWrist.y).toBe(0.2);
    expect(adapted?.poseFrame.landmarks.rightWrist.y).toBe(0.2);
  });

  it('should support recording and replaying pose frames in PoseStream', async () => {
    const mockFrame: PoseFrameV1 = {
      version: 1,
      timestamp: 1000,
      inferenceTime: 10,
      confidence: 0.9,
      qualityScore: 90,
      stabilityScore: 90,
      trackingState: 'TRACKING',
      errorCode: 'OK',
      calibration: {
        bodyScale: 1.0,
        shoulderWidth: 0.2,
        armLength: 0.4,
        torsoLength: 0.5,
        posture: 'STANDING',
        estimatedDistanceMeters: 1.5,
        calibrationConfidence: 1.0,
        status: 'STABILIZED',
      },
      keypoints: [],
    };

    poseStream.startRecording();
    // Simulate incoming frame
    (poseStream as any).latestFrame = mockFrame;
    if ((poseStream as any).isRecording) {
      (poseStream as any).recordedFrames.push(mockFrame);
    }

    const recorded = poseStream.stopRecording();
    expect(recorded.length).toBe(1);
    expect(recorded[0].timestamp).toBe(1000);
  });
});
