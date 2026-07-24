export interface ActivityCapabilities {
  requiresPose: boolean;
  requiresVoice: boolean;
  requiresCalibration: boolean;
  supportsAdaptiveDifficulty: boolean;
}

export interface ActivityDefinition {
  schemaVersion: number;
  activityVersion: number;
  id: string;
  title: string;
  description: string;
  validatorName: string;
  category:
    | 'body_movements'
    | 'hand_activities'
    | 'facial_expressions'
    | 'simple_movement'
    | 'pretend_play'
    | 'follow_the_leader';
  ageGroup: string;
  repetitions: number;
  holdDuration: number;
  timeout: number;
  difficulty: 'easy' | 'normal' | 'advanced';
  instruction: string;
  feedback: {
    success: string;
    encouragement: string;
    retry: string;
  };
  accessibility: {
    slowCountdown: boolean;
    highContrast: boolean;
  };
  reward: {
    stars: number;
    xp: number;
  };
  capabilities: ActivityCapabilities;
  isAvailable: boolean;
  relatedActivityIds: string[];
  metadata: {
    originalSection: string;
    canonicalIndex: number;
  };
}

export interface CatalogHeader {
  _notice: string;
  schemaVersion: number;
  catalogVersion: number;
  generatedAt: string;
  checksum: string;
  stats: {
    totalActivities: number;
    categoriesCount: number;
    validatorsUsedCount: number;
    unusedValidatorsCount: number;
  };
}
