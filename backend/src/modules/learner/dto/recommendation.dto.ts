/**
 * Recommendation DTOs
 *
 * Wire type for GET /v1/learner/:childId/recommendation.
 *
 * Phase 1: skillId / sessionPlanId are always null because the endpoint
 * delegates to the existing modality/duration recommendation from the
 * adaptive engine. Later phases fill these fields when the full
 * recommendation algorithm arrives (see design §7.2).
 *
 * @see docs/adaptive-engine/design-spec.md §4.1
 */

import type { ActivityType, RecommendationKind } from '../../../shared/enums.js';

export interface RecommendationDto {
  kind: RecommendationKind;
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
