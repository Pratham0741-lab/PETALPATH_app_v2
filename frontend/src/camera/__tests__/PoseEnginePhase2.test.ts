import { PoseFrameV1 } from '../CameraTypes';

describe('PetalPath Camera Engine v3 - Phase 2 Unit Tests', () => {
  it('should construct a valid extended PoseFrameV1 payload', () => {
    const mockFrame: PoseFrameV1 = {
      version: 1,
      timestamp: 1690000000000,
      inferenceTime: 12,
      confidence: 0.88,
      qualityScore: 92,
      stabilityScore: 95,
      trackingState: 'TRACKING',
      errorCode: 'OK',
      calibration: {
        bodyScale: 1.2,
        shoulderWidth: 0.25,
        armLength: 0.45,
        torsoLength: 0.5,
        posture: 'STANDING',
        estimatedDistanceMeters: 1.4,
        calibrationConfidence: 1.0,
        status: 'STABILIZED',
      },
      keypoints: [
        { index: 0, name: 'nose', x: 0.5, y: 0.3, score: 0.99 },
        { index: 5, name: 'left_shoulder', x: 0.4, y: 0.4, score: 0.95 },
        { index: 6, name: 'right_shoulder', x: 0.6, y: 0.4, score: 0.94 },
      ],
    };

    expect(mockFrame.version).toBe(1);
    expect(mockFrame.qualityScore).toBeGreaterThanOrEqual(0);
    expect(mockFrame.qualityScore).toBeLessThanOrEqual(100);
    expect(mockFrame.stabilityScore).toBe(95);
    expect(mockFrame.trackingState).toBe('TRACKING');
    expect(mockFrame.calibration.posture).toBe('STANDING');
    expect(mockFrame.keypoints.length).toBe(3);
  });
});
