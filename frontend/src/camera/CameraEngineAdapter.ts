import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import { CameraState, DiagnosticMetrics, PoseFrameListener, PoseFrameV1 } from './CameraTypes';
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

  private simulationTimer: any = null;

  private startSimulation() {
    if (this.simulationTimer) return;
    this.state = 'RUNNING';

    this.simulationTimer = setInterval(() => {
      const now = Date.now();
      const keypoints = [
        { index: 0, id: 0, x: 0.5, y: 0.2, score: 0.95 },
        { index: 1, id: 1, x: 0.48, y: 0.18, score: 0.95 },
        { index: 2, id: 2, x: 0.52, y: 0.18, score: 0.95 },
        { index: 3, id: 3, x: 0.45, y: 0.2, score: 0.95 },
        { index: 4, id: 4, x: 0.55, y: 0.2, score: 0.95 },
        { index: 5, id: 5, x: 0.4, y: 0.45, score: 0.95 },
        { index: 6, id: 6, x: 0.6, y: 0.45, score: 0.95 },
        { index: 7, id: 7, x: 0.35, y: 0.3, score: 0.95 },
        { index: 8, id: 8, x: 0.65, y: 0.3, score: 0.95 },
        { index: 9, id: 9, x: 0.35, y: 0.15, score: 0.95 },
        { index: 10, id: 10, x: 0.65, y: 0.15, score: 0.95 },
        { index: 11, id: 11, x: 0.42, y: 0.7, score: 0.95 },
        { index: 12, id: 12, x: 0.58, y: 0.7, score: 0.95 },
        { index: 13, id: 13, x: 0.43, y: 0.85, score: 0.95 },
        { index: 14, id: 14, x: 0.57, y: 0.85, score: 0.95 },
        { index: 15, id: 15, x: 0.44, y: 0.98, score: 0.95 },
        { index: 16, id: 16, x: 0.56, y: 0.98, score: 0.95 },
      ];

      const frame: PoseFrameV1 = {
        timestamp: now,
        inferenceTime: 12,
        keypoints,
        confidence: 0.92,
        overallConfidence: 0.92,
        acquired: true,
        qualityScore: 90,
        stabilityScore: 90,
        trackingState: 'TRACKING',
        posture: 'RAISE_HANDS',
      };

      this.listeners.forEach((listener) => listener(frame));
    }, 66);
  }

  private stopSimulation() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  public async start(): Promise<boolean> {
    if (!PetalPathCameraEngine) {
      console.warn('[CameraEngineAdapter] Native MoveNet engine missing. Starting JS simulation mode.');
      this.startSimulation();
      return true;
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
    this.stopSimulation();
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
      this.stopSimulation();
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
      this.startSimulation();
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
