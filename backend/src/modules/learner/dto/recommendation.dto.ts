/**
 * Recommendation DTOs
 *
 * Wire type for GET /v1/learner/:childId/recommendation.
 *
 * `kind` is a string union of the six recommendation kinds produced by the
 * deterministic engine (Phase 3.4). The frontend (Phase 2.6
 * RecommendationsScreen) consumes `kind` as a plain title-cased string, so
 * widening it from the legacy Prisma enum to this explicit union keeps the
 * wire contract identical while matching the production engine's output.
 *
 * @see docs/adaptive-engine/design-spec.md §4.1
 */

import type { ActivityType } from '../../../shared/enums.js';

/** Recommendation kinds the deterministic engine can emit (Phase 3.4). */
export type RecommendationKindValue =
  | 'CONTINUE_LESSON'
  | 'RETRY_ASSESSMENT'
  | 'PRACTICE'
  | 'REVIEW'
  | 'ROADMAP'
  | 'REWARD';

export interface RecommendationDto {
  kind: RecommendationKindValue;
  skillId: string | null;
  sessionPlanId: string | null;
  activityType: ActivityType | null;
  optimalSessionDurationMin: number;
  reasonCode: string;
  reasonText: string;
  confidence: number; // 0..1
  ttlSec: number;
  computedAt: string;
}
