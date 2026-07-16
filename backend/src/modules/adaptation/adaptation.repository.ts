import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { ActivityType, AdaptationEventType, MasteryState } from '../../shared/enums.js';

export class AdaptationRepository {
  async findLearningProfile(childId: string) {
    return prisma.learningProfile.findUnique({ where: { childId } });
  }

  async upsertLearningProfile(
    childId: string,
    data: {
      averageAccuracy: number;
      averageEngagement: number;
      averageConfidence: number;
      optimalSessionDuration: number;
      preferredModality: string;
      learningVelocity: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.learningProfile.upsert({
      where: { childId },
      create: { childId, ...data, preferredModality: data.preferredModality as ActivityType },
      update: { ...data, preferredModality: data.preferredModality as ActivityType },
    });
  }

  async findSkillHealths(childId: string) {
    return prisma.skillHealth.findMany({ where: { childId } });
  }

  async findCompletedSessions(childId: string, since?: Date) {
    const where: Prisma.SessionPlanWhereInput = {
      childId,
      status: 'COMPLETED',
      ...(since ? { completedAt: { gte: since } } : {}),
    };
    return prisma.sessionPlan.findMany({
      where,
      include: {
        sessionBlocks: {
          select: {
            id: true,
            skillId: true,
            activityType: true,
            difficulty: true,
            status: true,
            isReinforcement: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async findSessionPlans(childId: string, since?: Date) {
    const where: Prisma.SessionPlanWhereInput = {
      childId,
      ...(since ? { startedAt: { gte: since } } : {}),
    };
    return prisma.sessionPlan.findMany({
      where,
      select: {
        id: true,
        durationMinutes: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findSkillHistorySince(childId: string, since: Date) {
    return prisma.skillHistory.findMany({
      where: { childId, timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findModalityPerformances(childId: string) {
    return prisma.modalityPerformance.findMany({ where: { childId } });
  }

  async upsertModalityPerformance(
    childId: string,
    activityType: string,
    data: {
      attempts: number;
      averageAccuracy: number;
      averageEngagement: number;
      averageConfidence: number;
      lastUsedAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.modalityPerformance.upsert({
      where: { childId_activityType: { childId, activityType: activityType as ActivityType } },
      create: { childId, activityType: activityType as ActivityType, ...data },
      update: data,
    });
  }

  async batchUpdateSkillHealths(
    childId: string,
    updates: Array<{
      skillId: string;
      frequencyDays: number;
      decayFactor: number;
      nextReviewDate: Date;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    for (const u of updates) {
      await client.skillHealth.update({
        where: { childId_skillId: { childId, skillId: u.skillId } },
        data: {
          frequencyDays: u.frequencyDays,
          decayFactor: u.decayFactor,
          nextReviewDate: u.nextReviewDate,
        },
      });
    }
  }

  async createAdaptationEvent(
    childId: string,
    eventType: AdaptationEventType,
    reason: string,
    metadata?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.adaptationEvent.create({
      data: { childId, eventType, reason, metadata },
    });
  }

}

export const adaptationRepository = new AdaptationRepository();
