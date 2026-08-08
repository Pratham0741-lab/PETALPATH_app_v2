import { CameraActivityAdapter } from '../integration/CameraActivityAdapter';
import { activityEngine } from '../../features/camera/engine/activityEngine';
import { poseTracker } from '../../features/camera/detection/poseTracker';
import { ActivityType, ActivityEngineResult, Point3D } from '../../features/camera/types/pose.types';

export interface RecordedPoseFrame {
  timestampOffsetMs: number;
  landmarks: Point3D[];
  confidence: number;
  trackingState: 'searching' | 'tracking' | 'lost';
}

export class PoseReplayHarness {
  private isReplaying = false;

  public generateSyntheticRaiseHandsSequence(): RecordedPoseFrame[] {
    const frames: RecordedPoseFrame[] = [];
    const totalFrames = 30;

    for (let i = 0; i < totalFrames; i++) {
      const progress = i / totalFrames;
      const shoulderY = 0.5;
      const wristY = progress < 0.3 ? 0.7 : 0.2;

      const landmarks: Point3D[] = Array.from({ length: 33 }, (_, index) => {
        if (index === 11) return { x: 0.4, y: shoulderY, z: 0, visibility: 0.95 };
        if (index === 12) return { x: 0.6, y: shoulderY, z: 0, visibility: 0.95 };
        if (index === 15) return { x: 0.35, y: wristY, z: 0, visibility: 0.95 };
        if (index === 16) return { x: 0.65, y: wristY, z: 0, visibility: 0.95 };
        return { x: 0.5, y: 0.5, z: 0, visibility: 0.9 };
      });

      frames.push({
        timestampOffsetMs: i * 100,
        landmarks,
        confidence: 0.9,
        trackingState: 'tracking',
      });
    }

    return frames;
  }

  public async replaySequence(
    activityId: ActivityType,
    sequence: RecordedPoseFrame[],
    onStep: (result: ActivityEngineResult, frameIndex: number) => void
  ): Promise<ActivityEngineResult> {
    this.isReplaying = true;
    activityEngine.setActivity(activityId);

    let lastResult: ActivityEngineResult = {
      activityType: activityId,
      state: 'searching',
      confidence: 0,
      feedback: 'Starting replay...',
    };

    const history: any[] = [];

    for (let i = 0; i < sequence.length; i++) {
      if (!this.isReplaying) break;

      const frame = sequence[i];
      const poseFrame = {
        landmarks: {
          nose: frame.landmarks[0] || { x: 0.5, y: 0.2, z: 0 },
          leftEye: frame.landmarks[2] || { x: 0.45, y: 0.18, z: 0 },
          rightEye: frame.landmarks[5] || { x: 0.55, y: 0.18, z: 0 },
          leftEar: frame.landmarks[7] || { x: 0.4, y: 0.2, z: 0 },
          rightEar: frame.landmarks[8] || { x: 0.6, y: 0.2, z: 0 },
          leftShoulder: frame.landmarks[11] || { x: 0.4, y: 0.4, z: 0 },
          rightShoulder: frame.landmarks[12] || { x: 0.6, y: 0.4, z: 0 },
          leftElbow: frame.landmarks[13] || { x: 0.35, y: 0.5, z: 0 },
          rightElbow: frame.landmarks[14] || { x: 0.65, y: 0.5, z: 0 },
          leftWrist: frame.landmarks[15] || { x: 0.35, y: 0.2, z: 0 },
          rightWrist: frame.landmarks[16] || { x: 0.65, y: 0.2, z: 0 },
          leftHip: frame.landmarks[23] || { x: 0.45, y: 0.7, z: 0 },
          rightHip: frame.landmarks[24] || { x: 0.55, y: 0.7, z: 0 },
          leftKnee: frame.landmarks[25] || { x: 0.45, y: 0.85, z: 0 },
          rightKnee: frame.landmarks[26] || { x: 0.55, y: 0.85, z: 0 },
          leftAnkle: frame.landmarks[27] || { x: 0.45, y: 0.95, z: 0 },
          rightAnkle: frame.landmarks[28] || { x: 0.55, y: 0.95, z: 0 },
          rawLandmarks: frame.landmarks,
        },
        timestamp: Date.now() + frame.timestampOffsetMs,
        confidence: frame.confidence,
      };

      const smoothedPose = poseTracker.update(poseFrame as any);
      history.push(smoothedPose);
      lastResult = activityEngine.evaluate(smoothedPose, history);
      onStep(lastResult, i);

      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    this.isReplaying = false;
    return lastResult;
  }

  public stop() {
    this.isReplaying = false;
  }
}

export const poseReplayHarness = new PoseReplayHarness();
