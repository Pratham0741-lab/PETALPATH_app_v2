import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { MasteryState, CurriculumState } from '../../shared/enums.js';

export class MasteryEngineRepository {
  async findSkillHealth(childId: string, skillId: string) {
    return prisma.skillHealth.findUnique({
      where: { childId_skillId: { childId, skillId } },
    });
  }

  async findSkillHealths(childId: string) {
    return prisma.skillHealth.findMany({ where: { childId } });
  }

  async findChildCurriculum(childId: string, skillId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.childSkillCurriculum.findUnique({
      where: { childId_skillId: { childId, skillId } },
    });
  }

  async findChildCurriculums(childId: string) {
    return prisma.childSkillCurriculum.findMany({ where: { childId } });
  }

  async findAllDependencies() {
    return prisma.skillDependency.findMany();
  }

  async findDownstreamSkillIds(skillId: string): Promise<string[]> {
    const deps = await prisma.skillDependency.findMany({
      where: { parentSkillId: skillId },
      select: { childSkillId: true },
    });
    return deps.map((d) => d.childSkillId);
  }

  async findPrerequisiteSkillIds(skillId: string): Promise<string[]> {
    const deps = await prisma.skillDependency.findMany({
      where: { childSkillId: skillId },
      select: { parentSkillId: true },
    });
    return deps.map((d) => d.parentSkillId);
  }

  async findReinforcementQueues(childId: string) {
    return prisma.reinforcementQueue.findMany({
      where: { childId, isCompleted: false },
      include: { skill: { select: { name: true } } },
      orderBy: { priority: 'desc' },
    });
  }

  async findSkillHistory(childId: string, skillId: string) {
    return prisma.skillHistory.findMany({
      where: { childId, skillId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async upsertSkillHealth(
    childId: string,
    skillId: string,
    data: Prisma.SkillHealthUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.skillHealth.upsert({
      where: { childId_skillId: { childId, skillId } },
      create: { ...data, childId, skillId },
      update: data,
    });
  }

  async createSkillHistory(
    data: {
      childId: string;
      skillId: string;
      knowledgeScore: number;
      confidenceScore: number;
      retentionScore: number;
      engagementScore: number;
      consistencyScore: number;
      masteryScore: number;
      masteryState: MasteryState;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.skillHistory.create({
      data: {
        childId: data.childId,
        skillId: data.skillId,
        knowledgeScore: data.knowledgeScore,
        confidenceScore: data.confidenceScore,
        retentionScore: data.retentionScore,
        engagementScore: data.engagementScore,
        consistencyScore: data.consistencyScore,
        masteryScore: data.masteryScore,
        masteryState: data.masteryState,
      },
    });
  }

  async createRegressionLog(
    data: {
      childId: string;
      skillId: string;
      previousScore: number;
      currentScore: number;
      previousState: MasteryState;
      currentState: MasteryState;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.regressionLog.create({
      data: {
        childId: data.childId,
        skillId: data.skillId,
        previousScore: data.previousScore,
        currentScore: data.currentScore,
        difference: data.currentScore - data.previousScore,
        previousState: data.previousState,
        currentState: data.currentState,
      },
    });
  }

  async updateCurriculumState(
    childId: string,
    skillId: string,
    state: CurriculumState,
    completedAt?: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.childSkillCurriculum.upsert({
      where: { childId_skillId: { childId, skillId } },
      create: {
        childId,
        skillId,
        state,
        unlockRatio: state === CurriculumState.COMPLETED ? 1 : 0,
        priority: state === CurriculumState.COMPLETED ? 0 : 5,
        completedAt: completedAt ?? undefined,
      },
      update: {
        state,
        unlockRatio: state === CurriculumState.COMPLETED ? 1 : undefined,
        completedAt: completedAt ?? undefined,
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

  async findCurriculumStateBySkillIds(childId: string, skillIds: string[]) {
    return prisma.childSkillCurriculum.findMany({
      where: {
        childId,
        skillId: { in: skillIds },
      },
      select: { skillId: true, state: true },
    });
  }
}

export const masteryEngineRepository = new MasteryEngineRepository();
