export type DebugLevel = 'OFF' | 'BASIC' | 'PERFORMANCE' | 'LANDMARKS' | 'FULL';
export type MotionFilterType = 'ema' | 'one_euro' | 'kalman';

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PipelineStageTimings {
  captureTimeMs: number;
  mediaPipeTimeMs: number;
  trackerTimeMs: number;
  calibrationTimeMs: number;
  filterTimeMs: number;
  bridgeEmitTimeMs: number;
}

export interface PoseMetrics {
  cameraFPS: number;
  processingFPS: number;
  inferenceTimeMs: number;
  droppedFrames: number;
  queueDepth: number;
  cpuUsage: number;
  gpuUsage: number;
  trackingConfidence: number;
  stageTimings?: PipelineStageTimings;
}

export interface CalibrationData {
  scaleFactor: number;
  isCalibrated: boolean;
  shoulderWidth: number;
  estimatedArmSpan: number;
  postureMode: 'sitting' | 'standing';
  cameraDistanceEstimate: number;
  childHeightEstimate: number;
}

export interface EngineConfigOptions {
  trackingEnabled?: boolean;
  calibrationEnabled?: boolean;
  filterType?: MotionFilterType;
  gpuEnabled?: boolean;
  maxFPS?: number;
  debugLevel?: DebugLevel;
}

export interface PoseResultV1 {
  version: 'v1';
  timestamp: number;
  trackingState: 'searching' | 'tracking' | 'lost';
  confidence: number;
  qualityScore: number; // 0 - 100
  trackingId: number;
  metrics: PoseMetrics;
  calibration: CalibrationData;
  landmarks?: Landmark3D[];
}
