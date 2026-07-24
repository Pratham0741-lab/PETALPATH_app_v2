import { QUALITY_CONFIG, QualityState } from '../config/quality';
import { PoseFrame } from '../types/pose.types';

export class SessionQualityEngine {
  private currentState: QualityState = 'good';
  private pendingState: QualityState = 'good';
  private frameCounter = 0;

  public evaluateFrameQuality(frame: PoseFrame | null): QualityState {
    if (!frame || !frame.landmarks) {
      return this.updateWithHysteresis('poor');
    }

    const { confidence, landmarks } = frame;
    const lSh = landmarks.leftShoulder;
    const rSh = landmarks.rightShoulder;

    const visibility = Math.min(lSh?.visibility ?? 0, rSh?.visibility ?? 0);

    let rawQuality: QualityState = 'poor';

    if (
      visibility >= QUALITY_CONFIG.THRESHOLDS.GOOD.MIN_VISIBILITY &&
      confidence >= QUALITY_CONFIG.THRESHOLDS.GOOD.MIN_CONFIDENCE
    ) {
      rawQuality = 'good';
    } else if (
      visibility >= QUALITY_CONFIG.THRESHOLDS.ACCEPTABLE.MIN_VISIBILITY &&
      confidence >= QUALITY_CONFIG.THRESHOLDS.ACCEPTABLE.MIN_CONFIDENCE
    ) {
      rawQuality = 'acceptable';
    } else {
      rawQuality = 'poor';
    }

    return this.updateWithHysteresis(rawQuality);
  }

  private updateWithHysteresis(newRawQuality: QualityState): QualityState {
    if (newRawQuality === this.currentState) {
      this.pendingState = this.currentState;
      this.frameCounter = 0;
      return this.currentState;
    }

    if (newRawQuality === this.pendingState) {
      this.frameCounter += 1;
      if (this.frameCounter >= QUALITY_CONFIG.HYSTERESIS_WINDOW_FRAMES) {
        this.currentState = newRawQuality;
        this.frameCounter = 0;
      }
    } else {
      this.pendingState = newRawQuality;
      this.frameCounter = 1;
    }

    return this.currentState;
  }

  public getCurrentQuality(): QualityState {
    return this.currentState;
  }
}

export const sessionQualityEngine = new SessionQualityEngine();
