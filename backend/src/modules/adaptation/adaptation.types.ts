import type { ActivityType } from '../../shared/enums.js';

export interface PersonalizationFactors {
  learningSpeed: number;
  confidenceTrend: 'improving' | 'stable' | 'declining';
  retentionTrend: 'improving' | 'stable' | 'declining';
  reviewPerformance: number;
  masteryVelocity: number;
  struggleIndex: number;
  consistencyScore: number;
  sessionCompletionRate: number;
  averageSessionTime: number;
  difficultyPreference: number;
  knowledgeStability: number;
  confidenceStability: number;
  reviewFrequencyDays: number;
  learningMomentum: number;
  engagementTrend: 'improving' | 'stable' | 'declining';
}

export interface LearnerProfile {
  averageAccuracy: number;
  averageEngagement: number;
  averageConfidence: number;
  optimalSessionDuration: number;
  preferredModality: ActivityType;
  learningVelocity: number;
}

export interface AdaptationSummary {
  childId: string;
  factors: PersonalizationFactors;
  profile: LearnerProfile;
  changes: AdaptationChange[];
  roadmapRefreshed: boolean;
  analyzedAt: string;
}

export interface AdaptationChange {
  type: 'profile' | 'review_frequency' | 'reinforcement_priority' | 'modality_preference' | 'session_duration';
  field: string;
  previousValue: number | string;
  newValue: number | string;
  reason: string;
}

export interface CompletedSessionData {
  id: string;
  childId: string;
  durationMinutes: number;
  startedAt: Date | null;
  completedAt: Date | null;
  sessionBlocks: Array<{
    id: string;
    skillId: string | null;
    activityType: string;
    difficulty: string;
    status: string;
    isReinforcement: boolean;
  }>;
}
