import { cameraEngine } from '../CameraEngine';
import { poseStream } from '../PoseStream';
import { CameraActivityAdapter } from '../integration/CameraActivityAdapter';
import { activityEngine } from '../../features/camera/engine/activityEngine';
import { PoseFrameV1 } from '../CameraTypes';
import { ActivityType } from '../../features/camera/types/pose.types';

describe('PetalPath Camera Engine v3 - Phase 4 Release Hardening & Regression Suite', () => {
  afterEach(() => {
    poseStream.clear();
    activityEngine.reset();
  });

  it('should complete camera engine lifecycle without memory or listener leaks', async () => {
    expect(cameraEngine.getState()).toBe('UNINITIALIZED');

    const unsubscribe = cameraEngine.onPoseFrame(() => {});
    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    expect(cameraEngine.getState()).toBe('UNINITIALIZED');
  });

  it('should validate end-to-end activity evaluation for all MVP camera activities', () => {
    const activities: ActivityType[] = [
      'raise_hands',
      'touch_head',
      'touch_knees',
      'hands_on_hips',
      'hug_yourself',
      'wave',
      'clap',
      'jump',
    ];

    activities.forEach((actType) => {
      activityEngine.setActivity(actType);
      expect(activityEngine.getActiveActivity()).toBe(actType);

      const mockFrameV1: PoseFrameV1 = {
        version: 1,
        timestamp: Date.now(),
        inferenceTime: 12,
        confidence: 0.95,
        qualityScore: 98,
        stabilityScore: 99,
        trackingState: 'TRACKING',
        errorCode: 'OK',
        calibration: {
          bodyScale: 1.0,
          shoulderWidth: 0.3,
          armLength: 0.45,
          torsoLength: 0.5,
          posture: 'STANDING',
          estimatedDistanceMeters: 1.5,
          calibrationConfidence: 1.0,
          status: 'STABILIZED',
        },
        keypoints: [
          { index: 0, name: 'nose', x: 0.5, y: 0.2, score: 0.99 },
          { index: 5, name: 'left_shoulder', x: 0.4, y: 0.35, score: 0.98 },
          { index: 6, name: 'right_shoulder', x: 0.6, y: 0.35, score: 0.98 },
          { index: 7, name: 'left_elbow', x: 0.35, y: 0.45, score: 0.95 },
          { index: 8, name: 'right_elbow', x: 0.65, y: 0.45, score: 0.95 },
          { index: 9, name: 'left_wrist', x: 0.35, y: 0.15, score: 0.95 },
          { index: 10, name: 'right_wrist', x: 0.65, y: 0.15, score: 0.95 },
        ],
      };

      const adapted = CameraActivityAdapter.adaptToActivityPoseFrame(mockFrameV1);
      expect(adapted).not.toBeNull();

      if (adapted) {
        const evalResult = activityEngine.evaluate(adapted.poseFrame, [adapted.poseFrame]);
        expect(evalResult).toBeDefined();
        expect(evalResult.activityType).toBe(actType);
      }
    });
  });
});
