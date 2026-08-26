import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';
import { engineConfig } from '../../../shared/config/engine.config.js';
import { Prisma } from '@prisma/client';

/**
 * A health row plus enough of its skill to be shown to a person: the name, the
 * threshold it is measured against, and the domain it belongs to.
 *
 * `include: { skill: true }` gives back `domainId` and `subjectId` — two UUIDs.
 * Every screen that lists skills groups or labels them by domain, so without
 * the two nested joins the projection in `mastery.view.ts` has nothing to print
 * but 'General', and the parent's skill table collapses into one heap.
 */
const withSkillDetail = {
  skill: {
    include: { domain: true, subject: true },
  },
} as const;

export class SkillHealthRepository {
  async findByChildAndSkill(childId: string, skillId: string) {
    return prisma.skillHealth.findUnique({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      include: withSkillDetail,
    });
  }

  async findByChild(childId: string) {
    return prisma.skillHealth.findMany({
      where: { childId },
      include: withSkillDetail,
      orderBy: { masteryScore: 'desc' },
    });
  }

  async findWeakSkills(childId: string) {
    return prisma.skillHealth.findMany({
      where: {
        childId,
        OR: [
          { masteryState: MasteryState.WEAK },
          { masteryState: MasteryState.LEARNING },
          { masteryScore: { lt: 50.0 } },
        ],
      },
      include: withSkillDetail,
      orderBy: { masteryScore: 'asc' },
    });
  }

  async findDueReviews(childId: string, currentDate: Date) {
    return prisma.skillHealth.findMany({
      where: {
        childId,
        nextReviewDate: {
          lte: currentDate,
        },
      },
      include: { skill: true },
      orderBy: { nextReviewDate: 'asc' },
    });
  }

  /**
   * `nextReviewDate: new Date()` means "due the moment anyone asks", which is
   * the safe default for a row created without an explicit schedule — a caller
   * that knows the mastery state passes its own date in `data`.
   *
   * `decayFactor` used to default to 0.5 here: half a skill's retention lost
   * per day, against the engine's 0.995. Three different decay rates were
   * reachable depending on which code path created the row (0.995 from the
   * engine, 0.9 from placement, 0.5 from this default), which made the
   * forgetting curve a function of provenance rather than of the child.
   */
  async upsert(childId: string, skillId: string, data: Prisma.SkillHealthUpdateInput) {
    const defaults: Prisma.SkillHealthUncheckedCreateInput = {
      childId,
      skillId,
      confidenceScore: 0,
      retentionScore: 0,
      engagementScore: 0,
      consistencyScore: 0,
      masteryScore: 0,
      lastPracticed: new Date(),
      nextReviewDate: new Date(),
      reviewCount: 0,
      attemptCount: 0,
      retryCount: 0,
      decayFactor: engineConfig.mastery.retention.decayFactor,
      frequencyDays: engineConfig.unified.review.defaultCadenceDays,
      ...data,
    } as Prisma.SkillHealthUncheckedCreateInput;

    return prisma.skillHealth.upsert({
      where: {
        childId_skillId: {
          childId,
          skillId,
        },
      },
      update: data,
      create: defaults,
      include: { skill: true },
    });
  }
}

export const skillHealthRepository = new SkillHealthRepository();
