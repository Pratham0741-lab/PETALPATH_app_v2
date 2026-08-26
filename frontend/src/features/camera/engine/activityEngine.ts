/**
 * Decides, frame by frame, whether the child is doing the activity.
 *
 * Previously this switched on the eight-member `ActivityType` union and called
 * one of eight primitives directly. That was the ceiling on accuracy: the
 * catalog holds 99 activities, so 91 of them had to be squeezed into one of
 * eight poses regardless of what they actually asked for.
 *
 * It now resolves the validator by name through `validatorRegistry`, so a
 * catalog activity can name its own primitive. The `ActivityType` path still
 * works — each type maps to its default validator name — which keeps
 * `CameraActivityScreen`'s eight-button MVP screen unchanged.
 */

import {
  ActivityType,
  ActivityEngineResult,
  PoseFrame,
  ValidationResult,
} from '../types/pose.types';
import { validatorRegistry } from '../catalog/ValidatorRegistry';

/** Default primitive for each of the eight built-in activity types. */
const DEFAULT_VALIDATOR: Record<ActivityType, string> = {
  raise_hands: 'areHandsAboveShoulders',
  touch_head: 'isHandNearHead',
  touch_knees: 'isHandNearKnees',
  hands_on_hips: 'areHandsNearHips',
  hug_yourself: 'isArmCrossedAcrossTorso',
  wave: 'isHandMovingHorizontally',
  clap: 'areHandsTouching',
  jump: 'isBodyMovingVertically',
};

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  raise_hands: 'Raise Both Hands',
  touch_head: 'Touch Your Head',
  touch_knees: 'Touch Your Knees',
  hands_on_hips: 'Place Hands on Hips',
  hug_yourself: 'Give Yourself a Hug',
  wave: 'Wave Your Hand',
  clap: 'Clap Your Hands',
  jump: 'Jump Up and Down',
};

export class ActivityEngine {
  private activeActivity: ActivityType = 'raise_hands';
  private activityName: string | null = null;
  private validatorName: string = DEFAULT_VALIDATOR.raise_hands;
  private holdCount = 0;
  private readonly REQUIRED_HOLD_FRAMES = 2;

  /**
   * @param type         Coarse activity type, used for UI and telemetry.
   * @param displayName  The catalog title of the activity (e.g. "Stretch up
   *   high"). Many catalog activities share one primitive, so without this the
   *   feedback would name the primitive instead — "Stretch up high" would tell
   *   the child to "Raise Both Hands". Falls back to the primitive label.
   * @param validatorName  The catalog's own validator. When supplied and
   *   registered, it takes precedence over the type's default, which is what
   *   lets 99 activities behave like 99 activities.
   */
  public setActivity(type: ActivityType, displayName?: string, validatorName?: string): void {
    this.activeActivity = type;
    this.activityName = displayName?.trim() || null;

    const requested = validatorName?.trim();
    if (requested && validatorRegistry.hasValidator(requested)) {
      this.validatorName = requested;
    } else {
      if (requested) {
        console.warn(
          `[ActivityEngine] Unknown validator "${requested}" — falling back to ` +
            `"${DEFAULT_VALIDATOR[type]}" for activity type "${type}".`,
        );
      }
      this.validatorName = DEFAULT_VALIDATOR[type];
    }

    this.holdCount = 0;
  }

  public getActiveActivity(): ActivityType {
    return this.activeActivity;
  }

  /** The primitive currently deciding success. */
  public getValidatorName(): string {
    return this.validatorName;
  }

  /** True when the active validator checks engagement rather than a pose. */
  public isParticipationOnly(): boolean {
    return validatorRegistry.isParticipationValidator(this.validatorName);
  }

  /** The activity name shown to the child. */
  public getActivityName(): string {
    return this.activityName ?? ACTIVITY_LABEL[this.activeActivity] ?? this.activeActivity;
  }

  public evaluate(latestPose: PoseFrame | null, history: PoseFrame[]): ActivityEngineResult {
    if (!latestPose) {
      return {
        activityType: this.activeActivity,
        state: 'searching',
        confidence: 0,
        feedback: 'Position yourself in front of the camera',
        validatorName: this.validatorName,
        participationOnly: this.isParticipationOnly(),
      };
    }

    const validator = validatorRegistry.resolveValidator(this.validatorName);
    const result: ValidationResult = validator
      ? validator(latestPose, history)
      : { detected: false, confidence: 0, primitiveName: 'none' };

    const participationOnly = this.isParticipationOnly();

    if (result.detected) {
      this.holdCount += 1;
      const isCompleted = this.holdCount >= this.REQUIRED_HOLD_FRAMES;
      return {
        activityType: this.activeActivity,
        state: isCompleted ? 'completed' : 'detected',
        confidence: result.confidence,
        feedback: isCompleted ? `Great job! ${this.getActivityName()}` : 'Keep going!',
        hint: result.feedback,
        validatorName: result.primitiveName,
        participationOnly,
      };
    }

    this.holdCount = Math.max(0, this.holdCount - 1);
    return {
      activityType: this.activeActivity,
      state: 'searching',
      confidence: 0,
      feedback: `Try: ${this.getActivityName()}`,
      hint: result.feedback,
      validatorName: result.primitiveName,
      participationOnly,
    };
  }

  public reset(): void {
    this.holdCount = 0;
  }
}

export const activityEngine = new ActivityEngine();
