import { Point3D, PoseFrame, PoseLandmarks } from '../types/pose.types';
import { smoothLandmarks } from '../utils/poseSmoothing';
import { CAMERA_CONFIG } from '../config/camera.config';

export interface BodyMetrics {
  shoulderWidth: number;
  bodyCenter: Point3D;
  verticalVelocity: number;
  horizontalVelocity: number;
}

export class PoseTracker {
  private history: PoseFrame[] = [];
  private lastSmoothedPose: PoseLandmarks | null = null;

  public update(pose: PoseFrame): PoseFrame {
    // 1. Apply EMA Landmark Smoothing
    const smoothed = smoothLandmarks(pose.landmarks, this.lastSmoothedPose);
    this.lastSmoothedPose = smoothed;

    const smoothedFrame: PoseFrame = {
      ...pose,
      landmarks: smoothed,
    };

    // 2. Maintain Time-Based History Window (last 1.0s based on timestamp)
    const now = pose.timestamp;
    this.history.push(smoothedFrame);
    const cutoff = now - CAMERA_CONFIG.HISTORY_WINDOW_MS;
    this.history = this.history.filter((f) => f.timestamp >= cutoff);

    return smoothedFrame;
  }

  public getHistory(): PoseFrame[] {
    return this.history;
  }

  public getLatestPose(): PoseFrame | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Computes body scale & movement metrics from current and historical frames.
   */
  public computeBodyMetrics(): BodyMetrics | null {
    const latest = this.getLatestPose();
    if (!latest) return null;

    const { leftShoulder, rightShoulder, leftHip, rightHip } = latest.landmarks;

    // Calculate shoulder width for scale-invariant distance normalization
    const dx = leftShoulder.x - rightShoulder.x;
    const dy = leftShoulder.y - rightShoulder.y;
    const rawWidth = Math.hypot(dx, dy);
    const shoulderWidth = Math.max(rawWidth, 0.05); // Safeguard against divide-by-zero

    // Body Center (midpoint between shoulders and hips)
    const bodyCenter: Point3D = {
      x: (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4,
      y: (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4,
      z: (leftShoulder.z + rightShoulder.z + leftHip.z + rightHip.z) / 4,
    };

    // Calculate velocity over history buffer
    let verticalVelocity = 0;
    let horizontalVelocity = 0;

    if (this.history.length >= 2) {
      const first = this.history[0];
      const timeDeltaSec = (latest.timestamp - first.timestamp) / 1000;
      if (timeDeltaSec > 0.05) {
        const firstCenterY = (first.landmarks.leftShoulder.y + first.landmarks.rightShoulder.y) / 2;
        const latestCenterY = (leftShoulder.y + rightShoulder.y) / 2;
        verticalVelocity = (latestCenterY - firstCenterY) / timeDeltaSec;

        const firstWristX = first.landmarks.rightWrist.x;
        const latestWristX = latest.landmarks.rightWrist.x;
        horizontalVelocity = Math.abs(latestWristX - firstWristX) / timeDeltaSec;
      }
    }

    return {
      shoulderWidth,
      bodyCenter,
      verticalVelocity,
      horizontalVelocity,
    };
  }

  public reset(): void {
    this.history = [];
    this.lastSmoothedPose = null;
  }
}

export const poseTracker = new PoseTracker();
