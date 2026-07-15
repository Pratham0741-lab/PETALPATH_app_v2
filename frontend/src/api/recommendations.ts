/**
 * Learner Recommendation API
 *
 * Surfaces the AI-generated next-step recommendation for a child.
 * Endpoint: GET /learner/:childId/recommendation
 * Response : { success, data: LearnerRecommendation, meta: { generatedAt } }
 */

import { api } from './client';

export interface LearnerRecommendation {
  /** RecommendationKind enum value, e.g. "PRACTICE". */
  kind: string;
  /** Targeted skill id, or null when not skill-specific (Phase 1). */
  skillId: string | null;
  /** Linked session plan id, or null (Phase 1). */
  sessionPlanId: string | null;
  /** Preferred modality/activity type, e.g. "VIDEO". */
  activityType: string;
  /** Suggested session length in minutes. */
  optimalSessionDurationMin: number;
  /** Machine reason code, e.g. "ADAPTIVE_MODALITY_AND_DURATION". */
  reasonCode: string;
  /** Human-readable explanation of the recommendation. */
  reasonText: string;
  /** Model confidence in [0, 1]. */
  confidence: number;
  /** Cache lifetime in seconds. */
  ttlSec: number;
  /** ISO timestamp the recommendation was computed. */
  computedAt: string;
}

export interface RecommendationResponse {
  success: boolean;
  data: LearnerRecommendation;
  meta: { generatedAt: string };
}

export function getRecommendation(childId: string) {
  return api.get<RecommendationResponse>(`/learner/${childId}/recommendation`);
}
