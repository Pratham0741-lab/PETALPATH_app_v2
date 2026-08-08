import {
  IPoseDetector,
  PoseDetectorConfig,
  RawNativePoseResult,
  DetectorMetrics,
  NativePoseLandmark,
} from './types';
import { PoseDetectionResult, Point3D } from '../types/pose.types';
import { poseDetector } from '../detection/poseDetector';
import { MediaPipeBridge } from './MediaPipeBridge';

export class NativePoseDetector implements IPoseDetector {
  private initialized = false;
  private metrics: DetectorMetrics = {
    inferenceTimeMs: 0,
    fps: 0,
    delegateUsed: 'AUTO',
    modelLoaded: false,
    droppedFramesCount: 0,
  };
  private frameTimes: number[] = [];

  public async initialize(config: PoseDetectorConfig = {}): Promise<boolean> {
    const success = await MediaPipeBridge.initialize(config);
    this.initialized = success;
    this.metrics.modelLoaded = success;
    this.metrics.delegateUsed = config.delegate || 'AUTO';
    return success;
  }

  /**
   * Validates raw MediaPipe landmark output.
   * Enforces:
   * 1. Exactly 33 keypoints.
   * 2. Coordinates are finite numbers (not NaN / Infinity).
   * 3. Visibility values within [0, 1].
   */
  public validateLandmarks(landmarks: NativePoseLandmark[]): boolean {
    if (!landmarks || landmarks.length !== 33) {
      return false;
    }

    for (let i = 0; i < 33; i++) {
      const pt = landmarks[i];
      if (
        !Number.isFinite(pt.x) ||
        !Number.isFinite(pt.y) ||
        !Number.isFinite(pt.z) ||
        !Number.isFinite(pt.visibility ?? 1.0)
      ) {
        return false;
      }

      if (pt.visibility !== undefined && (pt.visibility < 0 || pt.visibility > 1.0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Processes raw MediaPipe result, validates landmarks, and maps to PoseDetectionResult.
   */
  public processResult(rawNativeResult: RawNativePoseResult): PoseDetectionResult {
    const now = Date.now();

    // Track FPS
    this.frameTimes.push(now);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }
    if (this.frameTimes.length > 1) {
      const elapsed = (now - this.frameTimes[0]) / 1000;
      this.metrics.fps = Math.round((this.frameTimes.length - 1) / Math.max(0.1, elapsed));
    }

    if (!rawNativeResult) {
      if (__DEV__) console.log('[NativePoseDetector] Rejected: rawNativeResult is null or undefined');
      return {
        detected: false,
        pose: null,
        confidence: 0,
        landmarkCount: 0,
      };
    }

    if (!rawNativeResult.poseDetected) {
      if (__DEV__) console.log('[NativePoseDetector] Rejected: poseDetected is false (MediaPipe returned zero poses / no person detected)');
      return {
        detected: false,
        pose: null,
        confidence: 0,
        landmarkCount: 0,
      };
    }

    if (!rawNativeResult.landmarks || rawNativeResult.landmarks.length === 0) {
      if (__DEV__) console.log('[NativePoseDetector] Rejected: Empty landmark list');
      return {
        detected: false,
        pose: null,
        confidence: 0,
        landmarkCount: 0,
      };
    }

    this.metrics.inferenceTimeMs = rawNativeResult.inferenceTimeMs || 0;
    if (rawNativeResult.delegateUsed) {
      this.metrics.delegateUsed = rawNativeResult.delegateUsed;
    }

    // Validate landmarks
    if (!this.validateLandmarks(rawNativeResult.landmarks)) {
      if (__DEV__) {
        console.log(
          `[NativePoseDetector] Rejected: Landmark validation failed. Landmark count = ${rawNativeResult.landmarks?.length} (Expected 33), with finite coordinates & visibility [0,1]`
        );
      }
      return {
        detected: false,
        pose: null,
        confidence: 0,
        landmarkCount: 0,
      };
    }

    const points3D: Point3D[] = rawNativeResult.landmarks.map((pt) => ({
      x: pt.x,
      y: pt.y,
      z: pt.z,
      visibility: pt.visibility ?? 0.9,
    }));

    const res = poseDetector.processCandidates(
      [{ landmarks: points3D, confidence: rawNativeResult.confidence || 0.9 }],
      rawNativeResult.timestamp || now,
    );

    if (!res.detected && __DEV__) {
      console.log(
        `[NativePoseDetector] Rejected by PoseDetector: Confidence ${rawNativeResult.confidence} below threshold or keypoints missing required joints`
      );
    }

    return res;
  }

  public dispose(): void {
    MediaPipeBridge.dispose();
    this.initialized = false;
    this.metrics.modelLoaded = false;
    this.frameTimes = [];
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getMetrics(): DetectorMetrics {
    return { ...this.metrics };
  }
}

export const nativePoseDetector = new NativePoseDetector();
