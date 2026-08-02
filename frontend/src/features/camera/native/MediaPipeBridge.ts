import { NativeModules } from 'react-native';
import { VisionCameraProxy, Frame } from 'react-native-vision-camera';
import { PoseDetectorConfig, RawNativePoseResult } from './types';

const { MediaPipePoseModule } = NativeModules;

/**
 * Top-level helper to safely initialize VisionCamera JSI Frame Processor Plugin
 */
export function initMediaPipePlugin() {
  try {
    if (VisionCameraProxy && typeof (VisionCameraProxy as any).initFrameProcessorPlugin === 'function') {
      return (VisionCameraProxy as any).initFrameProcessorPlugin('detectPose', {});
    }
  } catch (e) {
    // Plugin not loaded or running in JS-only mock environment
  }
  return null;
}

export class MediaPipeBridge {
  private static isInitialized = false;

  /**
   * Initializes native MediaPipe Pose Landmarker on native background thread.
   */
  public static async initialize(config: PoseDetectorConfig = {}): Promise<boolean> {
    const finalConfig = {
      modelType: config.modelType || 'lite',
      runningMode: config.runningMode || 'LIVE_STREAM',
      delegate: config.delegate || 'AUTO',
      minDetectionConfidence: config.minDetectionConfidence ?? 0.5,
      minTrackingConfidence: config.minTrackingConfidence ?? 0.5,
      minPresenceConfidence: config.minPresenceConfidence ?? 0.5,
    };

    try {
      if (MediaPipePoseModule && typeof MediaPipePoseModule.initialize === 'function') {
        const success = await MediaPipePoseModule.initialize(finalConfig);
        MediaPipeBridge.isInitialized = success;
        return success;
      }
      
      // Fallback flag for worklet plugin
      MediaPipeBridge.isInitialized = true;
      return true;
    } catch (error) {
      console.warn('[MediaPipeBridge] Native initialization failed:', error);
      MediaPipeBridge.isInitialized = false;
      return false;
    }
  }

  public static dispose(): void {
    if (MediaPipePoseModule && typeof MediaPipePoseModule.dispose === 'function') {
      MediaPipePoseModule.dispose();
    }
    MediaPipeBridge.isInitialized = false;
  }

  public static getIsInitialized(): boolean {
    return MediaPipeBridge.isInitialized;
  }
}
