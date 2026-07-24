import {
  ActivityType,
  ActivityEngineResult,
  PoseFrame,
  ValidationResult,
} from '../types/pose.types';
import {
  areHandsAboveShoulders,
  isHandNearHead,
  isHandNearKnees,
  areHandsNearHips,
  areHandsTouching,
  isArmCrossedAcrossTorso,
  isHandMovingHorizontally,
  isBodyMovingVertically,
} from '../validators/primitives';

export class ActivityEngine {
  private activeActivity: ActivityType = 'raise_hands';
  private holdCount = 0;
  private readonly REQUIRED_HOLD_FRAMES = 5;

  public setActivity(type: ActivityType): void {
    this.activeActivity = type;
    this.holdCount = 0;
  }

  public getActiveActivity(): ActivityType {
    return this.activeActivity;
  }

  public evaluate(latestPose: PoseFrame | null, history: PoseFrame[]): ActivityEngineResult {
    if (!latestPose) {
      return {
        activityType: this.activeActivity,
        state: 'searching',
        confidence: 0,
        feedback: 'Position yourself in front of the camera',
      };
    }

    let result: ValidationResult;

    switch (this.activeActivity) {
      case 'raise_hands':
        result = areHandsAboveShoulders(latestPose);
        break;
      case 'touch_head':
        result = isHandNearHead(latestPose);
        break;
      case 'touch_knees':
        result = isHandNearKnees(latestPose);
        break;
      case 'hands_on_hips':
        result = areHandsNearHips(latestPose);
        break;
      case 'hug_yourself':
        result = isArmCrossedAcrossTorso(latestPose);
        break;
      case 'clap':
        result = areHandsTouching(latestPose);
        break;
      case 'wave':
        result = isHandMovingHorizontally(history);
        break;
      case 'jump':
        result = isBodyMovingVertically(history);
        break;
      default:
        result = { detected: false, confidence: 0, primitiveName: 'none' };
    }

    if (result.detected) {
      this.holdCount += 1;
      const isCompleted = this.holdCount >= this.REQUIRED_HOLD_FRAMES;
      return {
        activityType: this.activeActivity,
        state: isCompleted ? 'completed' : 'detected',
        confidence: result.confidence,
        feedback: isCompleted ? `Great job! ${this.getActivityLabel(this.activeActivity)}!` : 'Keep going!',
      };
    }

    this.holdCount = Math.max(0, this.holdCount - 1);
    return {
      activityType: this.activeActivity,
      state: 'searching',
      confidence: 0,
      feedback: `Try to ${this.getActivityLabel(this.activeActivity)}`,
    };
  }

  private getActivityLabel(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
      raise_hands: 'Raise Both Hands',
      touch_head: 'Touch Your Head',
      touch_knees: 'Touch Your Knees',
      hands_on_hips: 'Place Hands on Hips',
      hug_yourself: 'Give Yourself a Hug',
      wave: 'Wave Your Hand',
      clap: 'Clap Your Hands',
      jump: 'Jump Up and Down',
    };
    return labels[type] || type;
  }

  public reset(): void {
    this.holdCount = 0;
  }
}

export const activityEngine = new ActivityEngine();
