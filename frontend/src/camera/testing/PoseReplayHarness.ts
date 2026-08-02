import { PoseResultV1, Landmark3D } from '../types/PoseResultV1';
import { activityEngine } from '../../features/camera/engine/activityEngine';
import { poseTracker } from '../../features/camera/detection/poseTracker';
import { nativePoseDetector } from '../../features/camera/native/NativePoseDetector';
import { ActivityType, ActivityEngineResult } from '../../features/camera/types/pose.types';

export interface RecordedPoseFrame {
  timestampOffsetMs: number;
  landmarks: Landmark3D[];
  confidence: number;
  trackingState: 'searching' | 'tracking' | 'lost';
}

export class PoseReplayHarness {
  private isReplaying = false;

  /**
   * Generates synthetic landmark frames for testing activities without a physical camera.
   */
  public generateSyntheticRaiseHandsSequence(): RecordedPoseFrame[] {
    const frames: RecordedPoseFrame[] = [];
    const totalFrames = 30;

    for (let i = 0; i < totalFrames; i++) {
      const progress = i / totalFrames;
      const shoulderY = 0.5;
      const wristY = progress < 0.3 ? 0.7 : 0.2; // Hands raised after frame 10

      const landmarks: Landmark3D[] = Array.from({ length: 33 }, (_, index) => {
        if (index === 11) return { x: 0.4, y: shoulderY, z: 0, visibility: 0.95 }; // Left shoulder
        if (index === 12) return { x: 0.6, y: shoulderY, z: 0, visibility: 0.95 }; // Right shoulder
        if (index === 15) return { x: 0.35, y: wristY, z: 0, visibility: 0.95 }; // Left wrist
        if (index === 16) return { x: 0.65, y: wristY, z: 0, visibility: 0.95 }; // Right wrist
        return { x: 0.5, y: 0.5, z: 0, visibility: 0.9 };
      });

      frames.push({
        timestampOffsetMs: i * 100, // 10 FPS replay speed
        landmarks,
        confidence: 0.9,
        trackingState: 'tracking',
      });
    }

    return frames;
  }

  /**
   * Replays recorded pose frames directly through nativePoseDetector and activityEngine.
   */
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

    for (let i = 0; i < sequence.length; i++) {
      if (!this.isReplaying) break;

      const frame = sequence[i];
      const points3D = frame.landmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
      }));

      const rawNativeResult = {
        poseDetected: frame.trackingState === 'tracking',
        confidence: frame.confidence,
        inferenceTimeMs: 15,
        landmarks: points3D,
        timestamp: Date.now() + frame.timestampOffsetMs,
      };

      const detectionRes = nativePoseDetector.processResult(rawNativeResult as any);
      if (detectionRes.detected && detectionRes.pose) {
        const smoothedPose = poseTracker.update(detectionRes.pose);
        lastResult = activityEngine.evaluate(smoothedPose, poseTracker.getHistory());
        onStep(lastResult, i);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.isReplaying = false;
    return lastResult;
  }

  public stop() {
    this.isReplaying = false;
  }
}

export const poseReplayHarness = new PoseReplayHarness();
