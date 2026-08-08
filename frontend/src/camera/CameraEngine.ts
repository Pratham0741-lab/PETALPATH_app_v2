import { CameraEngineAdapter } from './CameraEngineAdapter';
import { CameraState, DiagnosticMetrics, PoseFrameListener } from './CameraTypes';
import { ICameraEngine } from './ICameraEngine';

export class CameraEngine implements ICameraEngine {
  private static instance: CameraEngine | null = null;
  private adapter: CameraEngineAdapter;

  private constructor() {
    this.adapter = new CameraEngineAdapter();
  }

  public static getInstance(): CameraEngine {
    if (!CameraEngine.instance) {
      CameraEngine.instance = new CameraEngine();
    }
    return CameraEngine.instance;
  }

  public start(): Promise<boolean> {
    return this.adapter.start();
  }

  public stop(): Promise<boolean> {
    return this.adapter.stop();
  }

  public pause(): Promise<boolean> {
    return this.adapter.pause();
  }

  public resume(): Promise<boolean> {
    return this.adapter.resume();
  }

  public switchCamera(): Promise<boolean> {
    return this.adapter.switchCamera();
  }

  public onPoseFrame(listener: PoseFrameListener): () => void {
    return this.adapter.onPoseFrame(listener);
  }

  public getMetrics(): Promise<DiagnosticMetrics> {
    return this.adapter.getMetrics();
  }

  public getState(): CameraState {
    return this.adapter.getState();
  }
}

export const cameraEngine = CameraEngine.getInstance();
