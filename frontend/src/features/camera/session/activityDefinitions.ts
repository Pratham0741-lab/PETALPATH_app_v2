import { ActivityType } from '../types/pose.types';
import { ActivityCatalog } from '../catalog/ActivityCatalog';

export interface ActivityDefinition {
  id: ActivityType;
  primitive: string;
  holdDurationMs: number;
  repetitions: number;
  timeoutMs: number;
  confidenceThreshold: number;
}

export interface CurriculumActivityConfig {
  lessonId: string;
  activityId: string;
  activityType: ActivityType;
  title: string;
  instruction: string;
  mascotDialogue: string;
  validatorName: string;
  participationOnly: boolean;
  reward: {
    stars: number;
    xp: number;
  };
}

/**
 * Baseline confidence a pose must reach to count towards the hold.
 *
 * This has to be read against how the primitives now score. A pose at the very
 * edge of tolerance scores 0.60; a comfortably correct one approaches 1.00. So
 * 0.65 means "a little better than the bare minimum" — forgiving, per the design
 * intent for 3-8 year olds, but not a free pass.
 *
 * The previous value was 0.80, chosen when every primitive returned a hardcoded
 * 0.65. Nothing could ever have reached it — which was survivable only because
 * `ActivitySessionEngine` never actually compared against it. Now that the
 * comparison is real, the number has to mean something.
 *
 * `CameraRulesEngine` takes `Math.max` of this and the difficulty profile's
 * threshold, so difficulty can tighten it but never loosen below this floor.
 */
export const BASE_CONFIDENCE_THRESHOLD = 0.65;

/** Fallback timings, used when an activity is not in the catalog. */
const FALLBACK_HOLD_MS = 1500;
const FALLBACK_TIMEOUT_MS = 30000;

/**
 * Resolves the technical definition — hold time, reps, timeout, primitive.
 *
 * `activityId` is the catalog id (e.g. `clap_three_times`) and is preferred when
 * given; `type` is the coarse eight-member union and is only a fallback. That
 * order matters: looking up by type alone meant "Clap three times" resolved to
 * the `clap` entry and asked for one clap, and every catalog activity inherited
 * the timings of whichever of the eight types it had been bucketed into.
 */
export function getActivityDefinition(type: ActivityType, activityId?: string): ActivityDefinition {
  const catItem =
    (activityId ? ActivityCatalog.getActivity(activityId) : undefined) ?? ActivityCatalog.getActivity(type);

  if (catItem) {
    return {
      id: type,
      primitive: catItem.validatorName,
      holdDurationMs: catItem.holdDuration,
      repetitions: catItem.repetitions,
      timeoutMs: catItem.timeout,
      confidenceThreshold: BASE_CONFIDENCE_THRESHOLD,
    };
  }

  return {
    id: type,
    primitive: 'areHandsAboveShoulders',
    holdDurationMs: FALLBACK_HOLD_MS,
    repetitions: 1,
    timeoutMs: FALLBACK_TIMEOUT_MS,
    confidenceThreshold: BASE_CONFIDENCE_THRESHOLD,
  };
}

export function getDefaultCurriculumConfig(
  lessonId: string,
  activityId: string,
  activityType: ActivityType,
): CurriculumActivityConfig {
  const catItem = ActivityCatalog.getActivity(activityId) || ActivityCatalog.getActivity(activityType);

  if (catItem) {
    return {
      lessonId,
      activityId,
      activityType,
      title: catItem.title,
      instruction: catItem.instruction,
      mascotDialogue: `Let's do this activity together! ${catItem.instruction}`,
      validatorName: catItem.validatorName,
      participationOnly: catItem.validatorName === 'isChildParticipating',
      reward: catItem.reward,
    };
  }

  return {
    lessonId,
    activityId,
    activityType,
    title: 'Fun Camera Activity',
    instruction: 'Follow the mascot guide!',
    mascotDialogue: "Let's do this activity together!",
    validatorName: 'areHandsAboveShoulders',
    participationOnly: false,
    reward: {
      stars: 3,
      xp: 50,
    },
  };
}
