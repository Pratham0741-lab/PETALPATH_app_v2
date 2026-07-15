export enum ConflictType {
  DUPLICATE_TOPIC = 'DUPLICATE_TOPIC',
  DUPLICATE_TYPE = 'DUPLICATE_TYPE',
  INCOMPATIBLE_MODALITY = 'INCOMPATIBLE_MODALITY',
  RECOVERY_RESTRICTION = 'RECOVERY_RESTRICTION',
  MAX_DIFFICULTY_EXCEEDED = 'MAX_DIFFICULTY_EXCEEDED',
}

export enum ConflictResolution {
  KEEP_FIRST = 'KEEP_FIRST',
  KEEP_HIGHEST_PRIORITY = 'KEEP_HIGHEST_PRIORITY',
  REMOVE = 'REMOVE',
  ADJUST_DIFFICULTY = 'ADJUST_DIFFICULTY',
}

export class ExecutionConflict {
  readonly conflictType: ConflictType;
  readonly recommendationIds: string[];
  readonly resolution: ConflictResolution;

  constructor(
    conflictType: ConflictType,
    recommendationIds: string[],
    resolution: ConflictResolution,
  ) {
    this.conflictType = conflictType;
    this.recommendationIds = recommendationIds;
    this.resolution = resolution;
  }
}
