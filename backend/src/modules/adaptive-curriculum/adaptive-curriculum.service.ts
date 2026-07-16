import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { adaptiveCurriculumRepository } from './adaptive-curriculum.repository.js';
import type { SkillSearchFilters, PaginatedResult, SkillSearchResult, SkillDetailResult, PaginationParams } from './adaptive-curriculum.types.js';
import {
  createCurriculumGradeSchema,
  updateCurriculumGradeSchema,
  createCurriculumDomainSchema,
  updateCurriculumDomainSchema,
  createSkillActivitySchema,
  updateSkillActivitySchema,
  createSkillAssessmentSchema,
  updateSkillAssessmentSchema,
} from './adaptive-curriculum.validator.js';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import { z } from 'zod';

export class AdaptiveCurriculumService {
  async searchSkills(filters: SkillSearchFilters, pagination: PaginationParams): Promise<PaginatedResult<SkillSearchResult>> {
    const { items, total } = await adaptiveCurriculumRepository.searchSkills(filters, pagination);
    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getSkillDetail(skillId: string): Promise<SkillDetailResult> {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        subject: true,
        domain: true,
        skillTags: true,
        skillActivities: { orderBy: { displayOrder: 'asc' } },
        skillAssessments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!skill) {
      throw new NotFoundError('Skill not found');
    }

    const [parentDependencies, childDependencies] = await Promise.all([
      prisma.skillDependency.findMany({
        where: { childSkillId: skillId },
        include: { parentSkill: { select: { name: true } } },
      }),
      prisma.skillDependency.findMany({
        where: { parentSkillId: skillId },
        include: { childSkill: { select: { name: true } } },
      }),
    ]);

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      subjectId: skill.subjectId,
      subject: skill.subject,
      domainId: skill.domainId,
      domain: skill.domain,
      difficulty: skill.difficulty,
      estimatedAge: skill.estimatedAge,
      isRootSkill: skill.isRootSkill,
      bloomLevel: skill.bloomLevel,
      masteryThreshold: skill.masteryThreshold,
      estimatedDuration: skill.estimatedDuration,
      recommendedActivityType: skill.recommendedActivityType,
      recommendedAssessmentType: skill.recommendedAssessmentType,
      revisionInterval: skill.revisionInterval,
      originalGrade: skill.originalGrade,
      originalMonth: skill.originalMonth,
      displayOrder: skill.displayOrder,
      isCoreSkill: skill.isCoreSkill,
      isOptionalSkill: skill.isOptionalSkill,
      learningObjective: skill.learningObjective,
      tags: skill.skillTags.map((t) => ({ id: t.id, tag: t.tag })),
      activities: skill.skillActivities.map((a) => ({
        id: a.id,
        title: a.title,
        activityType: a.activityType,
        contentUrl: a.contentUrl,
        description: a.description,
        displayOrder: a.displayOrder,
      })),
      assessments: skill.skillAssessments.map((a) => ({
        id: a.id,
        title: a.title,
        assessmentType: a.assessmentType,
        description: a.description,
        maxScore: a.maxScore,
        passingScore: a.passingScore,
      })),
      parentDependencies: parentDependencies.map((d) => ({
        id: d.id,
        parentSkillId: d.parentSkillId,
        parentSkillName: d.parentSkill.name,
        weight: d.weight,
      })),
      childDependencies: childDependencies.map((d) => ({
        id: d.id,
        childSkillId: d.childSkillId,
        childSkillName: d.childSkill.name,
        weight: d.weight,
      })),
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }

  async getGrades() {
    return adaptiveCurriculumRepository.findAllGrades();
  }

  async getGrade(id: string) {
    const grade = await adaptiveCurriculumRepository.findGradeById(id);
    if (!grade) {
      throw new NotFoundError('Grade not found');
    }
    return grade;
  }

  async createGrade(data: z.infer<typeof createCurriculumGradeSchema>) {
    try {
      return await adaptiveCurriculumRepository.createGrade(data as Prisma.CurriculumGradeCreateInput);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2002') {
        throw new ConflictError(`Grade with number ${data.gradeNumber} already exists`);
      }
      throw err;
    }
  }

  async updateGrade(id: string, data: z.infer<typeof updateCurriculumGradeSchema>) {
    try {
      return await adaptiveCurriculumRepository.updateGrade(id, data as Prisma.CurriculumGradeUpdateInput);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2025') {
        throw new NotFoundError('Grade not found');
      }
      throw err;
    }
  }

  async deleteGrade(id: string) {
    try {
      return await adaptiveCurriculumRepository.deleteGrade(id);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2025') {
        throw new NotFoundError('Grade not found');
      }
      throw err;
    }
  }

  async getDomains() {
    return adaptiveCurriculumRepository.findAllDomains();
  }

  async getDomain(id: string) {
    const domain = await adaptiveCurriculumRepository.findDomainById(id);
    if (!domain) {
      throw new NotFoundError('Domain not found');
    }
    return domain;
  }

  async getDomainsBySubject(subjectId: string) {
    return adaptiveCurriculumRepository.findDomainsBySubject(subjectId);
  }

  async createDomain(data: z.infer<typeof createCurriculumDomainSchema>) {
    return adaptiveCurriculumRepository.createDomain(data as unknown as Prisma.CurriculumDomainCreateInput);
  }

  async updateDomain(id: string, data: z.infer<typeof updateCurriculumDomainSchema>) {
    const domain = await adaptiveCurriculumRepository.findDomainById(id);
    if (!domain) throw new NotFoundError('Domain not found');
    return adaptiveCurriculumRepository.updateDomain(id, data as Prisma.CurriculumDomainUpdateInput);
  }

  async deleteDomain(id: string) {
    const domain = await adaptiveCurriculumRepository.findDomainById(id);
    if (!domain) throw new NotFoundError('Domain not found');
    const skillCount = await prisma.skill.count({ where: { domainId: id } });
    if (skillCount > 0) {
      throw new ConflictError(`Cannot delete domain: ${skillCount} skills are assigned to it`);
    }
    return adaptiveCurriculumRepository.deleteDomain(id);
  }

  async getSkillTags(skillId: string) {
    return adaptiveCurriculumRepository.findTagsBySkill(skillId);
  }

  async addSkillTag(skillId: string, tag: string) {
    try {
      return await adaptiveCurriculumRepository.createTag(skillId, tag);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2003' || prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill not found');
      }
      if (prismaErr?.code === 'P2002') {
        throw new ConflictError(`Tag "${tag}" already exists for this skill`);
      }
      throw err;
    }
  }

  async removeSkillTag(skillId: string, tagId: string) {
    try {
      return await adaptiveCurriculumRepository.deleteTag(tagId);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill tag not found');
      }
      throw err;
    }
  }

  async getSkillActivities(skillId: string) {
    return adaptiveCurriculumRepository.findActivitiesBySkill(skillId);
  }

  async createSkillActivity(skillId: string, data: z.infer<typeof createSkillActivitySchema>) {
    try {
      return await adaptiveCurriculumRepository.createActivity(skillId, data as Prisma.SkillActivityCreateInput);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2003' || prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill not found');
      }
      throw err;
    }
  }

  async updateSkillActivity(activityId: string, data: z.infer<typeof updateSkillActivitySchema>) {
    try {
      return await adaptiveCurriculumRepository.updateActivity(activityId, data as Prisma.SkillActivityUpdateInput);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill activity not found');
      }
      throw err;
    }
  }

  async deleteSkillActivity(activityId: string) {
    try {
      return await adaptiveCurriculumRepository.deleteActivity(activityId);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill activity not found');
      }
      throw err;
    }
  }

  async getSkillAssessments(skillId: string) {
    return adaptiveCurriculumRepository.findAssessmentsBySkill(skillId);
  }

  async createSkillAssessment(skillId: string, data: z.infer<typeof createSkillAssessmentSchema>) {
    try {
      return await adaptiveCurriculumRepository.createAssessment(skillId, data as Prisma.SkillAssessmentCreateInput);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2003' || prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill not found');
      }
      throw err;
    }
  }

  async updateSkillAssessment(assessmentId: string, data: z.infer<typeof updateSkillAssessmentSchema>) {
    try {
      return await adaptiveCurriculumRepository.updateAssessment(assessmentId, data as Prisma.SkillAssessmentUpdateInput);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill assessment not found');
      }
      throw err;
    }
  }

  async deleteSkillAssessment(assessmentId: string) {
    try {
      return await adaptiveCurriculumRepository.deleteAssessment(assessmentId);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2025') {
        throw new NotFoundError('Skill assessment not found');
      }
      throw err;
    }
  }

  async bulkImport(data: {
    grades?: Prisma.CurriculumGradeCreateInput[];
    domains?: Prisma.CurriculumDomainCreateInput[];
    skills?: Prisma.SkillCreateInput[];
    skillTags?: { skillName: string; tags: string[] }[];
    skillActivities?: (Prisma.SkillActivityCreateInput & { skillName: string })[];
    skillAssessments?: (Prisma.SkillAssessmentCreateInput & { skillName: string })[];
  }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const gradesProcessed = data.grades?.length ?? 0;
        for (const grade of data.grades ?? []) {
          const { gradeNumber, ...rest } = grade;
          await tx.curriculumGrade.upsert({
            where: { gradeNumber: gradeNumber as number },
            update: rest as Prisma.CurriculumGradeUpdateInput,
            create: grade as Prisma.CurriculumGradeCreateInput,
          });
        }

        const domainsProcessed = data.domains?.length ?? 0;
        for (const domain of data.domains ?? []) {
          const { name, subjectId } = domain as Prisma.CurriculumDomainCreateInput & { name: string; subjectId: string };
          await tx.curriculumDomain.upsert({
            where: { name_subjectId: { name, subjectId } },
            update: domain as Prisma.CurriculumDomainUpdateInput,
            create: domain as Prisma.CurriculumDomainCreateInput,
          });
        }

        const skillsProcessed = data.skills?.length ?? 0;
        for (const skill of data.skills ?? []) {
          await tx.skill.upsert({
            where: { skillCode: (skill as Prisma.SkillCreateInput & { skillCode: string }).skillCode },
            update: skill as Prisma.SkillUpdateInput,
            create: skill as Prisma.SkillCreateInput,
          });
        }

        let tagsProcessed = 0;
        for (const entry of data.skillTags ?? []) {
          const skill = await tx.skill.findUnique({ where: { name: entry.skillName }, select: { id: true } });
          if (skill) {
            await tx.skillTag.deleteMany({ where: { skillId: skill.id } });
            if (entry.tags?.length > 0) {
              await tx.skillTag.createMany({
                data: entry.tags.map((tag: string) => ({ skillId: skill.id, tag })),
              });
              tagsProcessed += entry.tags.length;
            }
          }
        }

        let activitiesProcessed = 0;
        for (const activity of data.skillActivities ?? []) {
          const { skillName, ...activityData } = activity;
          const skill = await tx.skill.findUnique({ where: { name: skillName }, select: { id: true } });
          if (skill) {
            await tx.skillActivity.create({ data: { ...activityData, skillId: skill.id } as Prisma.SkillActivityCreateInput });
            activitiesProcessed++;
          }
        }

        let assessmentsProcessed = 0;
        for (const assessment of data.skillAssessments ?? []) {
          const { skillName, ...assessmentData } = assessment;
          const skill = await tx.skill.findUnique({ where: { name: skillName }, select: { id: true } });
          if (skill) {
            await tx.skillAssessment.create({ data: { ...assessmentData, skillId: skill.id } as Prisma.SkillAssessmentCreateInput });
            assessmentsProcessed++;
          }
        }

        return {
          gradesProcessed,
          domainsProcessed,
          skillsProcessed,
          tagsProcessed,
          activitiesProcessed,
          assessmentsProcessed,
        };
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      throw new ValidationError(`Bulk import failed: ${error.message ?? err}`);
    }
  }
}

export const adaptiveCurriculumService = new AdaptiveCurriculumService();
