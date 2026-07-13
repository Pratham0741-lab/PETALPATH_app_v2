/**
 * LearnerState DTOs
 *
 * Wire types for GET /v1/learner/:childId/state and the return type of
 * LearnerFacadeService.getLearnerState / recordPerformance results.
 *
 * @see docs/adaptive-engine/design-spec.md §4.1
 */

import type { ActivityType, RecommendationKind } from '../../../shared/enums.js';

export interface LearnerStateDto {
  childId: string;

  overallMasteryScore: number;
  masteredSkillCount: number;
  strongSkillCount: number;
  weakSkillCount: number;
  totalSkillCount: number;

  topWeakSkillIds: string[];
  topStrongSkillIds: string[];
  reviewsDueCount: number;
  reviewsDueSkillIds: string[];

  activeSessionPlanId: string | null;
  lastCompletedSessionAt: string | null;

  streakDays: number;
  longestStreakDays: number;
  engagementScore: number;

  preferredModality: ActivityType | null;
  optimalSessionDurationMin: number;

  lastRecommendationKind: RecommendationKind | null;
  lastRecommendationSkillId: string | null;
  lastRecommendationAt: string | null;
  lastRecommendationTTLSec: number;

  version: number;
  updatedAt: string;
}
