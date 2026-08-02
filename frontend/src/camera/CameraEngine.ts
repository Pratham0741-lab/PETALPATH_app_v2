import { NativeModules, NativeEventEmitter } from 'react-native';
import { PoseResultV1, DebugLevel, MotionFilterType, EngineConfigOptions } from './types/PoseResultV1';

const { CameraEngineModule } = NativeModules;

class CameraEngineV1 {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (CameraEngineModule) {
      this.eventEmitter = new NativeEventEmitter(CameraEngineModule);
    }
  }

  public async start(activityId: string): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.start(activityId);
  }

  public async stop(): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.stop();
  }

  public async pause(): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.pause();
  }

  public async resume(): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.resume();
  }

  public async switchCamera(): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.switchCamera();
  }

  public async setDebugLevel(level: DebugLevel): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.setDebugLevel(level);
  }

  public async setFilterType(type: MotionFilterType): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.setFilterType(type);
  }

  public async updateConfig(config: EngineConfigOptions): Promise<boolean> {
    if (!CameraEngineModule) return false;
    return await CameraEngineModule.updateConfig(config);
  }

  public onPoseResult(callback: (result: PoseResultV1) => void): { remove: () => void } {
    if (!this.eventEmitter) {
      return { remove: () => {} };
    }
    const subscription = this.eventEmitter.addListener('onPoseResult', callback);
    return {
      remove: () => subscription.remove(),
    };
  }
}

export const cameraEngineV1 = new CameraEngineV1();
export const cameraEngine = cameraEngineV1;
