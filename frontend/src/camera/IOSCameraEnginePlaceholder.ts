import { CameraState, DiagnosticMetrics, PoseFrameListener } from './CameraTypes';
import { ICameraEngine } from './ICameraEngine';

export class IOSCameraEnginePlaceholder implements ICameraEngine {
  private state: CameraState = 'UNINITIALIZED';

  public async start(): Promise<boolean> {
    console.warn('[IOSCameraEnginePlaceholder] iOS AVFoundation + CoreML engine placeholder for Phase 2.');
    this.state = 'READY';
    return true;
  }

  public async stop(): Promise<boolean> {
    this.state = 'STOPPED';
    return true;
  }

  public async pause(): Promise<boolean> {
    this.state = 'PAUSED';
    return true;
  }

  public async resume(): Promise<boolean> {
    this.state = 'RUNNING';
    return true;
  }

  public async switchCamera(): Promise<boolean> {
    return true;
  }

  public onPoseFrame(_listener: PoseFrameListener): () => void {
    return () => {};
  }

  public async getMetrics(): Promise<DiagnosticMetrics> {
    return {
      framesReceived: 0,
      framesProcessed: 0,
      framesDropped: 0,
      queueDepth: 0,
      cameraState: this.state,
      modelState: 'PLACEHOLDER',
      interpreterState: 'PLACEHOLDER',
      delegateType: 'AVFOUNDATION_COREML',
      lastInferenceMs: 0,
      averageInferenceMs: 0,
      peakInferenceMs: 0,
      cameraFps: 0,
      inferenceFps: 0,
      usedMemoryMb: 0,
      watchdogAlert: 'IOS_PHASE_2_STUB',
    };
  }

  public getState(): CameraState {
    return this.state;
  }
}
