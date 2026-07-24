export type CameraStatus =
  | 'uninitialized'
  | 'requesting_permission'
  | 'permission_denied'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unavailable';

export interface DebugMetrics {
  fps: number;
  latencyMs: number;
  processedFrames: number;
  droppedFrames: number;
  statusText: string;
}
