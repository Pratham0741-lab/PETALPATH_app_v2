/**
 * TypeScript declaration-merging shim for the Phase 1 LearnerState model
 * and the RecommendationKind enum. This file exists to keep the TypeScript
 * compiler in sync with `prisma/schema.prisma` in environments where
 * `npx prisma generate` has not yet been run (fresh clone, CI cache miss,
 * offline sandbox).
 *
 * The declarations here are byte-compatible with what `prisma generate`
 * emits for these types. When the Prisma client is regenerated they merge
 * additively via ambient declaration merging — this file therefore
 * remains safe to keep in the repo indefinitely.
 *
 * Delete only if the code stops referencing prisma.learnerState or
 * RecommendationKind directly.
 *
 * @see docs/adaptive-engine/design-spec.md §2.1
 */

import type { PrismaClient, Prisma } from '@prisma/client';

declare module '@prisma/client' {
  /** RecommendationKind enum — matches the enum declared in schema.prisma. */
  export const RecommendationKind: {
    readonly NEW_SKILL: 'NEW_SKILL';
    readonly REVIEW: 'REVIEW';
    readonly PRACTICE: 'PRACTICE';
    readonly CHALLENGE: 'CHALLENGE';
    readonly MIXED_PRACTICE: 'MIXED_PRACTICE';
    readonly REST: 'REST';
  };
  export type RecommendationKind =
    (typeof RecommendationKind)[keyof typeof RecommendationKind];

  /** Persisted LearnerState row — matches the model in schema.prisma. */
  export interface LearnerState {
    id: string;
    childId: string;

    overallMasteryScore: number;
    masteredSkillCount: number;
    strongSkillCount: number;
    weakSkillCount: number;
    totalSkillCount: number;

    topWeakSkillIds: Prisma.JsonValue;
    topStrongSkillIds: Prisma.JsonValue;
    reviewsDueCount: number;
    reviewsDueSkillIds: Prisma.JsonValue;

    activeSessionPlanId: string | null;
    lastCompletedSessionAt: Date | null;

    streakDays: number;
    longestStreakDays: number;
    engagementScore: number;

    preferredModality: Prisma.$Enums.ActivityType | null;
    optimalSessionDurationMin: number;

    lastRecommendationKind: RecommendationKind | null;
    lastRecommendationSkillId: string | null;
    lastRecommendationAt: Date | null;
    lastRecommendationTTLSec: number;

    updatedAt: Date;
    version: number;
  }

  namespace Prisma {
    /**
     * Input shape for LearnerState upsert.create — mirrors what Prisma emits
     * for a create call on this model.
     */
    interface LearnerStateCreateInput {
      id?: string;
      child: { connect: { id: string } };

      overallMasteryScore?: number;
      masteredSkillCount?: number;
      strongSkillCount?: number;
      weakSkillCount?: number;
      totalSkillCount?: number;

      topWeakSkillIds?: Prisma.InputJsonValue;
      topStrongSkillIds?: Prisma.InputJsonValue;
      reviewsDueCount?: number;
      reviewsDueSkillIds?: Prisma.InputJsonValue;

      activeSessionPlanId?: string | null;
      lastCompletedSessionAt?: Date | string | null;

      streakDays?: number;
      longestStreakDays?: number;
      engagementScore?: number;

      preferredModality?: Prisma.$Enums.ActivityType | null;
      optimalSessionDurationMin?: number;

      lastRecommendationKind?: RecommendationKind | null;
      lastRecommendationSkillId?: string | null;
      lastRecommendationAt?: Date | string | null;
      lastRecommendationTTLSec?: number;

      version?: number;
    }

    interface LearnerStateUpdateInput {
      overallMasteryScore?: number;
      masteredSkillCount?: number;
      strongSkillCount?: number;
      weakSkillCount?: number;
      totalSkillCount?: number;

      topWeakSkillIds?: Prisma.InputJsonValue;
      topStrongSkillIds?: Prisma.InputJsonValue;
      reviewsDueCount?: number;
      reviewsDueSkillIds?: Prisma.InputJsonValue;

      activeSessionPlanId?: string | null;
      lastCompletedSessionAt?: Date | string | null;

      streakDays?: number;
      longestStreakDays?: number;
      engagementScore?: number;

      preferredModality?: Prisma.$Enums.ActivityType | null;
      optimalSessionDurationMin?: number;

      lastRecommendationKind?: RecommendationKind | null;
      lastRecommendationSkillId?: string | null;
      lastRecommendationAt?: Date | string | null;
      lastRecommendationTTLSec?: number;

      version?: number | { increment: number };
    }
  }

  interface PrismaClient {
    learnerState: {
      findUnique(args: {
        where: { childId?: string; id?: string };
      }): Promise<LearnerState | null>;
      findFirst(args?: unknown): Promise<LearnerState | null>;
      upsert(args: {
        where: { childId: string };
        update: Prisma.LearnerStateUpdateInput;
        create: Prisma.LearnerStateCreateInput;
      }): Promise<LearnerState>;
      create(args: {
        data: Prisma.LearnerStateCreateInput;
      }): Promise<LearnerState>;
      deleteMany(args: { where: { childId: string } }): Promise<{ count: number }>;
    };
  }
}
