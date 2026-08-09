import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { CameraState, DiagnosticMetrics, PoseFrameListener, PoseFrameV1 } from './CameraTypes';
import { ICameraEngine } from './ICameraEngine';

const MODULE_NAME = 'PetalPathCameraEngine';

/**
 * The native module is looked up lazily on every access rather than destructured
 * at module import time.
 *
 * Under the New Architecture, `NativeModules.X` for a legacy module is resolved
 * through the TurboModule interop layer, which is not necessarily ready when this
 * file is first imported. Capturing the value once at import time can therefore
 * pin `undefined` for the whole app session and make a perfectly functional
 * native engine look permanently missing.
 */
function getNativeModule(): any | null {
  if (Platform.OS !== 'android') return null;
  try {
    return (NativeModules as any)[MODULE_NAME] ?? null;
  } catch (error) {
    return null;
  }
}

export class CameraEngineAdapter implements ICameraEngine {
  private state: CameraState = 'UNINITIALIZED';
  private listeners: Set<PoseFrameListener> = new Set();
  private eventSubscription: any = null;
  private emitter: NativeEventEmitter | null = null;

  /** Whether the native camera engine is present in this build. */
  public isNativeAvailable(): boolean {
    return getNativeModule() != null;
  }

  /**
   * Attaches the pose-frame listener on first use. Deferred (not done in the
   * constructor) because the adapter is instantiated at import time via the
   * CameraEngine singleton, which can precede native module registration.
   */
  private ensureEventSubscription() {
    if (this.eventSubscription) return;

    const nativeModule = getNativeModule();
    if (!nativeModule) return;

    try {
      this.emitter = this.emitter ?? new NativeEventEmitter(nativeModule);
      this.eventSubscription = this.emitter.addListener('onPoseFrame', (event: PoseFrameV1) => {
        this.listeners.forEach((listener) => listener(event));
      });
    } catch (error) {
      console.warn('[CameraEngineAdapter] Could not subscribe to onPoseFrame:', error);
    }
  }

  public async start(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (!nativeModule) {
      console.warn(
        `[CameraEngineAdapter] Native module "${MODULE_NAME}" is unavailable. ` +
          'Native code cannot be delivered over-the-air — install a new development/preview build.'
      );
      this.state = 'ERROR';
      return false;
    }

    // Subscribe before starting so no early frames are missed.
    this.ensureEventSubscription();

    this.state = 'INITIALIZING';
    try {
      const success = await nativeModule.start();
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
    const nativeModule = getNativeModule();
    if (!nativeModule) return false;
    this.state = 'STOPPING';
    try {
      const success = await nativeModule.stop();
      this.state = 'STOPPED';
      return success;
    } catch (error) {
      this.state = 'ERROR';
      return false;
    }
  }

  public async pause(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (!nativeModule) return false;
    try {
      const success = await nativeModule.pause();
      if (success) this.state = 'PAUSED';
      return success;
    } catch (error) {
      return false;
    }
  }

  public async resume(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (!nativeModule) return false;
    try {
      const success = await nativeModule.resume();
      if (success) this.state = 'RUNNING';
      return success;
    } catch (error) {
      return false;
    }
  }

  public async switchCamera(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (!nativeModule) return false;
    try {
      return await nativeModule.switchCamera();
    } catch (error) {
      return false;
    }
  }

  public onPoseFrame(listener: PoseFrameListener): () => void {
    // Ensure the native subscription exists even if a consumer subscribes
    // before start() is called.
    this.ensureEventSubscription();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async getMetrics(): Promise<DiagnosticMetrics> {
    const nativeModule = getNativeModule();
    if (!nativeModule) {
      return {
        framesReceived: 0,
        framesProcessed: 0,
        framesDropped: 0,
        queueDepth: 0,
        cameraState: this.state,
        modelState: 'UNLOADED',
        interpreterState: 'UNINITIALIZED',
        delegateType: 'NONE',
        lastInferenceMs: 0,
        averageInferenceMs: 0,
        peakInferenceMs: 0,
        cameraFps: 0,
        inferenceFps: 0,
        usedMemoryMb: 0,
        watchdogAlert: 'NATIVE_MODULE_MISSING',
      };
    }

    try {
      const rawMetrics = await nativeModule.getMetrics();
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
