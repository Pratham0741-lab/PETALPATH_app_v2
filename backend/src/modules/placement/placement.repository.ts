import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { AssessmentAttemptStatus, CurriculumState, MasteryState } from '../../shared/enums.js';

export class PlacementRepository {
  async findAssessmentByAgeGroup(ageGroup: string) {
    return prisma.assessment.findFirst({
      where: { ageGroup, isActive: true, deletedAt: null },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findAssessmentById(assessmentId: string) {
    return prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async createAttempt(childId: string, assessmentId: string) {
    return prisma.assessmentAttempt.create({
      data: {
        childId,
        assessmentId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  async findAttemptById(attemptId: string) {
    return prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
  }

  async completeAttempt(
    attemptId: string,
    data: {
      status: AssessmentAttemptStatus;
      completedAt: Date;
      rawResponses: Prisma.InputJsonValue;
      score: number;
      maxScore: number;
      percentage: number;
    }
  ) {
    return prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: data.status,
        completedAt: data.completedAt,
        rawResponses: data.rawResponses,
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.percentage,
      },
    });
  }

  async findChildSkillCurriculums(childId: string) {
    return prisma.childSkillCurriculum.findMany({
      where: { childId },
    });
  }

  async findSkillHealths(childId: string) {
    return prisma.skillHealth.findMany({
      where: { childId },
    });
  }

  async findRootSkills() {
    return prisma.skill.findMany({
      where: { isRootSkill: true },
      select: { id: true, name: true, skillCode: true, subjectId: true, domainId: true },
    });
  }

  async findSkillsByIds(skillIds: string[]) {
    return prisma.skill.findMany({
      where: { id: { in: skillIds } },
    });
  }

  async findPrerequisiteSkillIds(skillId: string): Promise<string[]> {
    const deps = await prisma.skillDependency.findMany({
      where: { childSkillId: skillId },
      select: { parentSkillId: true },
    });
    return deps.map((d) => d.parentSkillId);
  }

  async findChildSkillIds(childId: string): Promise<string[]> {
    const csc = await prisma.childSkillCurriculum.findMany({
      where: { childId },
      select: { skillId: true },
    });
    return csc.map((c) => c.skillId);
  }

  async findReinforcementQueues(childId: string) {
    return prisma.reinforcementQueue.findMany({
      where: { childId },
    });
  }

  async findDynamicRoadmap(childId: string) {
    return prisma.dynamicRoadmap.findUnique({
      where: { childId },
    });
  }

  async upsertChildSkillCurriculum(
    childId: string,
    skillId: string,
    data: { state: CurriculumState; unlockRatio?: number; priority?: number }
  ) {
    return prisma.childSkillCurriculum.upsert({
      where: { childId_skillId: { childId, skillId } },
      create: {
        childId,
        skillId,
        state: data.state,
        unlockRatio: data.unlockRatio ?? 0,
        priority: data.priority ?? 1,
      },
      update: {
        state: data.state,
        unlockRatio: data.unlockRatio ?? undefined,
        priority: data.priority ?? undefined,
      },
    });
  }

  async batchUpsertChildSkillCurriculum(
    childId: string,
    entries: Array<{ skillId: string; state: CurriculumState; unlockRatio?: number; priority?: number }>
  ) {
    for (const entry of entries) {
      await this.upsertChildSkillCurriculum(childId, entry.skillId, entry);
    }
  }

  async upsertSkillHealth(
    childId: string,
    skillId: string,
    data: {
      masteryState: MasteryState;
      knowledgeScore: number;
      confidenceScore: number;
      masteryScore: number;
      lastPracticed: Date;
      nextReviewDate: Date;
      reviewCount: number;
      attemptCount: number;
      retryCount: number;
      decayFactor: number;
      frequencyDays: number;
    }
  ) {
    return prisma.skillHealth.upsert({
      where: { childId_skillId: { childId, skillId } },
      create: {
        childId,
        skillId,
        masteryState: data.masteryState,
        knowledgeScore: data.knowledgeScore,
        confidenceScore: data.confidenceScore,
        retentionScore: 0,
        engagementScore: 0,
        consistencyScore: 0,
        masteryScore: data.masteryScore,
        lastPracticed: data.lastPracticed,
        nextReviewDate: data.nextReviewDate,
        reviewCount: data.reviewCount,
        attemptCount: data.attemptCount,
        retryCount: data.retryCount,
        decayFactor: data.decayFactor,
        frequencyDays: data.frequencyDays,
      },
      update: {
        masteryState: data.masteryState,
        knowledgeScore: data.knowledgeScore,
        confidenceScore: data.confidenceScore,
        masteryScore: data.masteryScore,
        lastPracticed: data.lastPracticed,
        nextReviewDate: data.nextReviewDate,
        reviewCount: data.reviewCount,
        attemptCount: data.attemptCount,
        retryCount: data.retryCount,
        decayFactor: data.decayFactor,
        frequencyDays: data.frequencyDays,
      },
    });
  }

  async createReinforcementQueue(childId: string, skillId: string, reason: string, priority: number) {
    const now = new Date();
    const nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return prisma.reinforcementQueue.upsert({
      where: { childId_skillId: { childId, skillId } },
      create: {
        childId,
        skillId,
        priority,
        masteryState: MasteryState.LEARNING,
        reason,
        isCompleted: false,
        nextReviewDate: nextReview,
      },
      update: {
        priority,
        reason,
        isCompleted: false,
        nextReviewDate: nextReview,
      },
    });
  }

  async upsertDynamicRoadmap(childId: string, roadmapJson: Prisma.InputJsonValue, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.dynamicRoadmap.upsert({
      where: { childId },
      create: {
        childId,
        roadmapJson,
        generatedAt: new Date(),
      },
      update: {
        roadmapJson,
        version: { increment: 1 },
        generatedAt: new Date(),
      },
    });
  }
}

export const placementRepository = new PlacementRepository();
