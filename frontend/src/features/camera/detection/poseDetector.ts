import { Point3D, PoseLandmarks, PoseFrame, PoseDetectionResult } from '../types/pose.types';
import { CAMERA_CONFIG } from '../config/camera.config';

export class PoseDetector {
  private activeTrackId: string | null = null;

  /**
   * Helper to build a PoseLandmarks structure from raw MediaPipe 33-point array.
   */
  public createPoseLandmarks(pts: Point3D[]): PoseLandmarks {
    const defaultPt: Point3D = { x: 0, y: 0, z: 0, visibility: 0 };
    const getPt = (idx: number): Point3D => pts[idx] || defaultPt;

    return {
      nose: getPt(0),
      leftEye: getPt(2),
      rightEye: getPt(5),
      leftEar: getPt(7),
      rightEar: getPt(8),
      leftShoulder: getPt(11),
      rightShoulder: getPt(12),
      leftElbow: getPt(13),
      rightElbow: getPt(14),
      leftWrist: getPt(15),
      rightWrist: getPt(16),
      leftHip: getPt(23),
      rightHip: getPt(24),
      leftKnee: getPt(25),
      rightKnee: getPt(26),
      leftAnkle: getPt(27),
      rightAnkle: getPt(28),
      rawLandmarks: pts,
    };
  }

  /**
   * Evaluates detected raw candidates and selects a single primary subject according to single-person policy.
   */
  public processCandidates(
    candidates: Array<{ landmarks: Point3D[]; confidence: number; trackId?: string }>,
    timestamp: number = Date.now(),
  ): PoseDetectionResult {
    if (!candidates || candidates.length === 0) {
      this.activeTrackId = null;
      return {
        detected: false,
        pose: null,
        confidence: 0,
        landmarkCount: 0,
      };
    }

    // Single-Person Selection Policy:
    // 1. If active subject trackId exists and is in candidates, keep tracking active subject.
    // 2. Otherwise, select candidate with highest confidence / largest bounding box.
    let selected = candidates[0];
    if (this.activeTrackId) {
      const match = candidates.find((c) => c.trackId === this.activeTrackId);
      if (match) {
        selected = match;
      } else {
        selected = candidates.reduce((max, c) => (c.confidence > max.confidence ? c : max), candidates[0]);
      }
    } else {
      selected = candidates.reduce((max, c) => (c.confidence > max.confidence ? c : max), candidates[0]);
    }

    if (selected.trackId) {
      this.activeTrackId = selected.trackId;
    }

    // Filter out low visibility points below threshold
    const filteredPoints = selected.landmarks.map((pt) => {
      const vis = pt.visibility ?? 1.0;
      if (vis < CAMERA_CONFIG.MIN_LANDMARK_CONFIDENCE) {
        return { ...pt, visibility: 0 };
      }
      return pt;
    });

    const landmarks = this.createPoseLandmarks(filteredPoints);
    const validCount = filteredPoints.filter((p) => (p.visibility ?? 0) >= CAMERA_CONFIG.MIN_LANDMARK_CONFIDENCE).length;

    const poseFrame: PoseFrame = {
      landmarks,
      timestamp,
      confidence: selected.confidence,
    };

    return {
      detected: validCount >= 6, // Requires at least core upper-body landmarks
      pose: poseFrame,
      confidence: selected.confidence,
      landmarkCount: validCount,
    };
  }

  public resetTrack(): void {
    this.activeTrackId = null;
  }
}

export const poseDetector = new PoseDetector();
