import { cameraEngine } from './CameraEngine';
import { PoseFrameListener, PoseFrameV1 } from './CameraTypes';

export class PoseStream {
  private static instance: PoseStream | null = null;
  private listeners: Set<PoseFrameListener> = new Set();
  private latestFrame: PoseFrameV1 | null = null;
  private isPaused = false;
  private unsubscribeNative: (() => void) | null = null;

  // Frame recording buffer for regression testing & debugging
  private isRecording = false;
  private recordedFrames: PoseFrameV1[] = [];

  private constructor() {
    this.initNativeListener();
  }

  public static getInstance(): PoseStream {
    if (!PoseStream.instance) {
      PoseStream.instance = new PoseStream();
    }
    return PoseStream.instance;
  }

  private initNativeListener() {
    if (this.unsubscribeNative) {
      this.unsubscribeNative();
    }

    this.unsubscribeNative = cameraEngine.onPoseFrame((frame: PoseFrameV1) => {
      if (this.isPaused) return;

      this.latestFrame = frame;

      if (this.isRecording) {
        this.recordedFrames.push(frame);
      }

      this.listeners.forEach((listener) => {
        try {
          listener(frame);
        } catch (error) {
          console.error('[PoseStream] Listener error:', error);
        }
      });
    });
  }

  public subscribe(listener: PoseFrameListener): () => void {
    this.listeners.add(listener);
    if (this.latestFrame) {
      listener(this.latestFrame);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public unsubscribe(listener: PoseFrameListener): void {
    this.listeners.delete(listener);
  }

  public getLatestFrame(): PoseFrameV1 | null {
    return this.latestFrame;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public clear(): void {
    this.latestFrame = null;
    this.recordedFrames = [];
  }

  // --- Recording & Replay Engine ---

  public startRecording(): void {
    this.recordedFrames = [];
    this.isRecording = true;
  }

  public stopRecording(): PoseFrameV1[] {
    this.isRecording = false;
    return [...this.recordedFrames];
  }

  public getRecordedFrames(): PoseFrameV1[] {
    return [...this.recordedFrames];
  }

  public replay(frames: PoseFrameV1[], fps: number = 30): Promise<void> {
    return new Promise((resolve) => {
      if (frames.length === 0) {
        resolve();
        return;
      }

      let index = 0;
      const intervalMs = 1000 / fps;

      const timer = setInterval(() => {
        if (index >= frames.length) {
          clearInterval(timer);
          resolve();
          return;
        }

        const frame = frames[index++];
        this.latestFrame = frame;
        this.listeners.forEach((listener) => listener(frame));
      }, intervalMs);
    });
  }
}

export const poseStream = PoseStream.getInstance();
