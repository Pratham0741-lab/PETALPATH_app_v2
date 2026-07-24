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
  reward: {
    stars: number;
    xp: number;
  };
}

export function getActivityDefinition(type: ActivityType): ActivityDefinition {
  const catItem = ActivityCatalog.getActivity(type);
  if (catItem) {
    return {
      id: catItem.id as ActivityType,
      primitive: catItem.validatorName,
      holdDurationMs: catItem.holdDuration,
      repetitions: catItem.repetitions,
      timeoutMs: catItem.timeout,
      confidenceThreshold: 0.8,
    };
  }

  return {
    id: type,
    primitive: 'areHandsAboveShoulders',
    holdDurationMs: 1500,
    repetitions: 1,
    timeoutMs: 30000,
    confidenceThreshold: 0.8,
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
      reward: catItem.reward,
    };
  }

  return {
    lessonId,
    activityId,
    activityType,
    title: 'Fun Camera Activity',
    instruction: 'Follow the mascot guide!',
    mascotDialogue: 'Let\'s do this activity together!',
    reward: {
      stars: 3,
      xp: 50,
    },
  };
}
