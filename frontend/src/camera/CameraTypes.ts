export type CameraEngineMode = 'legacy' | 'movenet';

export type CameraState =
  | 'UNINITIALIZED'
  | 'INITIALIZING'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'ERROR';

export type NativeTrackingState = 'SEARCHING' | 'TRACKING' | 'LOST' | 'RECOVERING';

export interface PoseKeypoint {
  index: number;
  name: string;
  x: number; // Normalized [0, 1]
  y: number; // Normalized [0, 1]
  score: number; // Confidence [0, 1]
}

export interface CalibrationPayload {
  bodyScale: number;
  shoulderWidth: number;
  armLength: number;
  torsoLength: number;
  posture: 'STANDING' | 'SITTING' | 'UNKNOWN';
  estimatedDistanceMeters: number;
  calibrationConfidence: number;
  status: 'WARMING_UP' | 'STABILIZED';
}

export interface PoseFrameV1 {
  version: 1;
  timestamp: number;
  inferenceTime: number;
  confidence: number;
  qualityScore: number; // 0 - 100
  stabilityScore: number; // 0 - 100
  trackingState: NativeTrackingState;
  errorCode: string;
  calibration: CalibrationPayload;
  keypoints: PoseKeypoint[];
}

export interface ModelMetadata {
  modelName: string;
  modelVersion: string;
  inputResolutionWidth: number;
  inputResolutionHeight: number;
  keypointCount: number;
  delegateType: string;
}

export interface DiagnosticMetrics {
  framesReceived: number;
  framesProcessed: number;
  framesDropped: number;
  queueDepth: number;
  cameraState: CameraState;
  modelState: string;
  interpreterState: string;
  delegateType: string;
  lastInferenceMs: number;
  averageInferenceMs: number;
  peakInferenceMs: number;
  trackingMs?: number;
  filteringMs?: number;
  calibrationMs?: number;
  evaluationMs?: number;
  mappingMs?: number;
  qualityScore?: number;
  stabilityScore?: number;
  trackingState?: NativeTrackingState;
  posture?: string;
  poseLosses?: number;
  recoveries?: number;
  cameraFps: number;
  inferenceFps: number;
  usedMemoryMb: number;
  watchdogAlert: string;
  modelMetadata?: ModelMetadata;
}

export type PoseFrameListener = (frame: PoseFrameV1) => void;
