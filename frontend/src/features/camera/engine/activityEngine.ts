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
  private activityName: string | null = null;
  private holdCount = 0;
  private readonly REQUIRED_HOLD_FRAMES = 2;

  /**
   * `displayName` is the catalog title of the activity being performed (e.g.
   * "Stretch up high"). Several catalog activities share a single pose
   * primitive, so without it the feedback would name the primitive instead —
   * "Stretch up high" would tell the child to "Raise Both Hands".
   * Falls back to the primitive label when omitted.
   */
  public setActivity(type: ActivityType, displayName?: string): void {
    this.activeActivity = type;
    this.activityName = displayName?.trim() || null;
    this.holdCount = 0;
  }

  public getActiveActivity(): ActivityType {
    return this.activeActivity;
  }

  /** The activity name shown to the child. */
  public getActivityName(): string {
    return this.activityName ?? this.getActivityLabel(this.activeActivity);
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
        feedback: isCompleted ? `Great job! ${this.getActivityName()}` : 'Keep going!',
      };
    }

    this.holdCount = Math.max(0, this.holdCount - 1);
    return {
      activityType: this.activeActivity,
      state: 'searching',
      confidence: 0,
      feedback: `Try: ${this.getActivityName()}`,
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
