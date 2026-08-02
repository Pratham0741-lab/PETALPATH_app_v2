import { PoseDetectionResult } from '../types/pose.types';

export type MediaPipeModelType = 'lite' | 'full';
export type RunningMode = 'LIVE_STREAM' | 'VIDEO' | 'IMAGE';
export type DelegateType = 'GPU' | 'CPU' | 'AUTO';

export interface PoseDetectorConfig {
  modelType?: MediaPipeModelType;
  runningMode?: RunningMode;
  delegate?: DelegateType;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  minPresenceConfidence?: number;
}

export interface NativePoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface RawNativePoseResult {
  poseDetected: boolean;
  confidence: number;
  landmarks: NativePoseLandmark[];
  timestamp: number;
  inferenceTimeMs: number;
  delegateUsed: string;
}

export interface DetectorMetrics {
  inferenceTimeMs: number;
  fps: number;
  delegateUsed: string;
  modelLoaded: boolean;
  droppedFramesCount: number;
}

export interface IPoseDetector {
  initialize(config?: PoseDetectorConfig): Promise<boolean>;
  processResult(rawNativeResult: RawNativePoseResult): PoseDetectionResult;
  dispose(): void;
  isInitialized(): boolean;
  getMetrics(): DetectorMetrics;
}
