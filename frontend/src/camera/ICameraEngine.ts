import { CameraState, DiagnosticMetrics, PoseFrameListener } from './CameraTypes';

export interface ICameraEngine {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  pause(): Promise<boolean>;
  resume(): Promise<boolean>;
  switchCamera(): Promise<boolean>;
  onPoseFrame(listener: PoseFrameListener): () => void;
  getMetrics(): Promise<DiagnosticMetrics>;
  getState(): CameraState;
}
