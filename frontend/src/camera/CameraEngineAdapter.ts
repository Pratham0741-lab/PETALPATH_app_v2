import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import { CameraState, DiagnosticMetrics, PoseFrameListener, PoseFrameV1, PoseKeypoint } from './CameraTypes';
import { ICameraEngine } from './ICameraEngine';

const { PetalPathCameraEngine } = NativeModules;

export class CameraEngineAdapter implements ICameraEngine {
  private state: CameraState = 'UNINITIALIZED';
  private listeners: Set<PoseFrameListener> = new Set();
  private eventSubscription: any = null;

  constructor() {
    if (Platform.OS === 'android') {
      this.eventSubscription = DeviceEventEmitter.addListener('onPoseFrame', (event: PoseFrameV1) => {
        this.listeners.forEach((listener) => listener(event));
      });
    }
  }

  public async start(): Promise<boolean> {
    if (!PetalPathCameraEngine) {
      console.warn('[CameraEngineAdapter] Native MoveNet engine missing (NativeModules.PetalPathCameraEngine is undefined).');
      this.state = 'ERROR';
      return false;
    }

    this.state = 'INITIALIZING';
    try {
      const success = await PetalPathCameraEngine.start();
      if (success) {
        this.state = 'RUNNING';
      } else {
        this.state = 'ERROR';
      }
      return success;
    } catch (error) {
      this.state = 'ERROR';
      console.error('[CameraEngineAdapter] Failed to start camera engine:', error);
      return false;
    }
  }

  public async stop(): Promise<boolean> {
    if (!PetalPathCameraEngine) {
      this.state = 'STOPPED';
      return true;
    }
    this.state = 'STOPPING';
    try {
      const success = await PetalPathCameraEngine.stop();
      this.state = 'STOPPED';
      return success;
    } catch (error) {
      this.state = 'ERROR';
      return false;
    }
  }

  public async pause(): Promise<boolean> {
    if (!PetalPathCameraEngine) {
      this.state = 'PAUSED';
      return true;
    }
    try {
      const success = await PetalPathCameraEngine.pause();
      if (success) this.state = 'PAUSED';
      return success;
    } catch (error) {
      return false;
    }
  }

  public async resume(): Promise<boolean> {
    if (!PetalPathCameraEngine) {
      this.state = 'RUNNING';
      return true;
    }
    try {
      const success = await PetalPathCameraEngine.resume();
      if (success) this.state = 'RUNNING';
      return success;
    } catch (error) {
      return false;
    }
  }

  public async switchCamera(): Promise<boolean> {
    if (!PetalPathCameraEngine) return true;
    try {
      return await PetalPathCameraEngine.switchCamera();
    } catch (error) {
      return false;
    }
  }

  public onPoseFrame(listener: PoseFrameListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async getMetrics(): Promise<DiagnosticMetrics> {
    if (!PetalPathCameraEngine) {
      return {
        framesReceived: 100,
        framesProcessed: 100,
        framesDropped: 0,
        queueDepth: 0,
        cameraState: this.state,
        modelState: 'READY',
        interpreterState: 'JS_SIMULATION',
        delegateType: 'CPU_SIMULATION',
        lastInferenceMs: 12,
        averageInferenceMs: 12,
        peakInferenceMs: 15,
        cameraFps: 15.0,
        inferenceFps: 15.0,
        usedMemoryMb: 24,
        watchdogAlert: 'NORMAL',
      };
    }

    try {
      const rawMetrics = await PetalPathCameraEngine.getMetrics();
      return rawMetrics as DiagnosticMetrics;
    } catch (error) {
      return {
        framesReceived: 0,
        framesProcessed: 0,
        framesDropped: 0,
        queueDepth: 0,
        cameraState: 'ERROR',
        modelState: 'ERROR',
        interpreterState: 'ERROR',
        delegateType: 'NONE',
        lastInferenceMs: 0,
        averageInferenceMs: 0,
        peakInferenceMs: 0,
        cameraFps: 0,
        inferenceFps: 0,
        usedMemoryMb: 0,
        watchdogAlert: 'METRICS_FETCH_ERROR',
      };
    }
  }

  public getState(): CameraState {
    return this.state;
  }

  public destroy() {
    if (this.eventSubscription) {
      this.eventSubscription.remove();
      this.eventSubscription = null;
    }
    this.listeners.clear();
  }
}
