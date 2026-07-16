import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { CurriculumState } from '../../shared/enums.js';

export class SkillRoadmapRepository {
  async findChildCurriculums(childId: string) {
    return prisma.childSkillCurriculum.findMany({
      where: { childId },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            skillCode: true,
            subjectId: true,
            difficulty: true,
            displayOrder: true,
            estimatedDuration: true,
            isCoreSkill: true,
            isOptionalSkill: true,
          },
        },
      },
    });
  }

  async findSkillHealths(childId: string) {
    return prisma.skillHealth.findMany({
      where: { childId },
    });
  }

  async findAllSkills() {
    return prisma.skill.findMany();
  }

  async findAllDependencies() {
    return prisma.skillDependency.findMany();
  }

  async findPendingReinforcements(childId: string) {
    return prisma.reinforcementQueue.findMany({
      where: { childId, isCompleted: false },
    });
  }

  async findDynamicRoadmap(childId: string) {
    return prisma.dynamicRoadmap.findUnique({
      where: { childId },
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

  async updateCurriculumState(childId: string, skillId: string, state: CurriculumState, unlockRatio?: number) {
    return prisma.childSkillCurriculum.update({
      where: { childId_skillId: { childId, skillId } },
      data: {
        state,
        ...(unlockRatio !== undefined ? { unlockRatio } : {}),
      },
    });
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
}

export const skillRoadmapRepository = new SkillRoadmapRepository();
