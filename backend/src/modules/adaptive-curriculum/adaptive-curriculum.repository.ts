import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

export class AdaptiveCurriculumRepository {
  // ── CurriculumGrade ────────────────────────────────────────────────────────

  async findAllGrades() {
    return prisma.curriculumGrade.findMany({
      orderBy: { gradeNumber: 'asc' },
    });
  }

  async findGradeById(id: string) {
    return prisma.curriculumGrade.findUnique({ where: { id } });
  }

  async findGradeByNumber(gradeNumber: number) {
    return prisma.curriculumGrade.findUnique({ where: { gradeNumber } });
  }

  async createGrade(data: Prisma.CurriculumGradeCreateInput) {
    return prisma.curriculumGrade.create({ data });
  }

  async updateGrade(id: string, data: Prisma.CurriculumGradeUpdateInput) {
    return prisma.curriculumGrade.update({ where: { id }, data });
  }

  async deleteGrade(id: string) {
    return prisma.curriculumGrade.delete({ where: { id } });
  }

  async upsertGrade(data: Prisma.CurriculumGradeCreateInput) {
    const { gradeNumber, ...rest } = data as any;
    return prisma.curriculumGrade.upsert({
      where: { gradeNumber },
      update: rest,
      create: data as Prisma.CurriculumGradeCreateInput,
    });
  }

  // ── CurriculumDomain ───────────────────────────────────────────────────────

  async findAllDomains() {
    return prisma.curriculumDomain.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { subject: true },
    });
  }

  async findDomainById(id: string) {
    return prisma.curriculumDomain.findUnique({
      where: { id },
      include: { subject: true },
    });
  }

  async findDomainsBySubject(subjectId: string) {
    return prisma.curriculumDomain.findMany({
      where: { subjectId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createDomain(data: Prisma.CurriculumDomainCreateInput) {
    return prisma.curriculumDomain.create({ data });
  }

  async updateDomain(id: string, data: Prisma.CurriculumDomainUpdateInput) {
    return prisma.curriculumDomain.update({ where: { id }, data });
  }

  async deleteDomain(id: string) {
    const skillCount = await prisma.skill.count({ where: { domainId: id } });
    if (skillCount > 0) {
      return { success: false, message: `Cannot delete domain: ${skillCount} skill(s) still reference it` };
    }
    await prisma.curriculumDomain.delete({ where: { id } });
    return { success: true };
  }

  async upsertDomain(data: Prisma.CurriculumDomainCreateInput) {
    const { name, subjectId } = data as any;
    return prisma.curriculumDomain.upsert({
      where: { name_subjectId: { name, subjectId } },
      update: data as Prisma.CurriculumDomainUpdateInput,
      create: data as Prisma.CurriculumDomainCreateInput,
    });
  }

  // ── SkillTag ───────────────────────────────────────────────────────────────

  async findTagsBySkill(skillId: string) {
    return prisma.skillTag.findMany({ where: { skillId } });
  }

  async createTag(skillId: string, tag: string) {
    return prisma.skillTag.create({ data: { skillId, tag } });
  }

  async deleteTag(id: string) {
    return prisma.skillTag.delete({ where: { id } });
  }

  async deleteTagBySkillAndTag(skillId: string, tag: string) {
    return prisma.skillTag.delete({
      where: { skillId_tag: { skillId, tag } },
    });
  }

  // ── SkillActivity ─────────────────────────────────────────────────────────

  async findActivitiesBySkill(skillId: string) {
    return prisma.skillActivity.findMany({
      where: { skillId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findActivityById(id: string) {
    return prisma.skillActivity.findUnique({
      where: { id },
      include: { skill: true },
    });
  }

  async createActivity(skillId: string, data: Prisma.SkillActivityCreateInput) {
    return prisma.skillActivity.create({
      data: { ...data, skill: { connect: { id: skillId } } } as any,
    });
  }

  async updateActivity(id: string, data: Prisma.SkillActivityUpdateInput) {
    return prisma.skillActivity.update({ where: { id }, data });
  }

  async deleteActivity(id: string) {
    return prisma.skillActivity.delete({ where: { id } });
  }

  // ── SkillAssessment ────────────────────────────────────────────────────────

  async findAssessmentsBySkill(skillId: string) {
    return prisma.skillAssessment.findMany({
      where: { skillId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAssessmentById(id: string) {
    return prisma.skillAssessment.findUnique({
      where: { id },
      include: { skill: true },
    });
  }

  async createAssessment(skillId: string, data: Prisma.SkillAssessmentCreateInput) {
    return prisma.skillAssessment.create({
      data: { ...data, skill: { connect: { id: skillId } } } as any,
    });
  }

  async updateAssessment(id: string, data: Prisma.SkillAssessmentUpdateInput) {
    return prisma.skillAssessment.update({ where: { id }, data });
  }

  async deleteAssessment(id: string) {
    return prisma.skillAssessment.delete({ where: { id } });
  }

  // ── Skill search ───────────────────────────────────────────────────────────

  async searchSkills(
    filters: {
      query?: string;
      subjectId?: string;
      domainId?: string;
      bloomLevel?: string;
      difficulty?: number;
      estimatedAge?: number;
      originalGrade?: number;
      originalMonth?: number;
      isCoreSkill?: boolean;
      isRootSkill?: boolean;
      tags?: string[];
    },
    pagination: { page: number; limit: number }
  ) {
    const where: Prisma.SkillWhereInput = {};

    if (filters.query) {
      where.name = { contains: filters.query, mode: 'insensitive' };
    }
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.domainId) where.domainId = filters.domainId;
    if (filters.bloomLevel) where.bloomLevel = filters.bloomLevel;
    if (filters.difficulty !== undefined) where.difficulty = filters.difficulty;
    if (filters.estimatedAge !== undefined) where.estimatedAge = filters.estimatedAge;
    if (filters.originalGrade !== undefined) where.originalGrade = filters.originalGrade;
    if (filters.originalMonth !== undefined) where.originalMonth = filters.originalMonth;
    if (filters.isCoreSkill !== undefined) where.isCoreSkill = filters.isCoreSkill;
    if (filters.isRootSkill !== undefined) where.isRootSkill = filters.isRootSkill;
    if (filters.tags && filters.tags.length > 0) {
      where.skillTags = { some: { tag: { in: filters.tags } } };
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          subject: { select: { name: true } },
          domain: { select: { name: true } },
          skillTags: { select: { tag: true } },
        },
      }),
      prisma.skill.count({ where }),
    ]);

    return {
      items: items.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        subjectId: skill.subjectId,
        subjectName: skill.subject.name,
        domainId: skill.domainId,
        domainName: skill.domain?.name ?? null,
        difficulty: skill.difficulty,
        bloomLevel: skill.bloomLevel,
        displayOrder: skill.displayOrder,
        isCoreSkill: skill.isCoreSkill,
        isRootSkill: skill.isRootSkill,
        originalGrade: skill.originalGrade,
        tags: skill.skillTags.map((t) => t.tag),
        masteryThreshold: skill.masteryThreshold,
        estimatedDuration: skill.estimatedDuration,
      })),
      total,
    };
  }
}

export const adaptiveCurriculumRepository = new AdaptiveCurriculumRepository();
