import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { curriculumService } from '../curriculum/index.js';

export class AssessmentsRepository {
  async findActive() {
    return prisma.assessment.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async create(data: Prisma.AssessmentCreateInput) {
    return prisma.assessment.create({
      data,
      include: {
        questions: true,
      },
    });
  }

  async findAttemptById(id: string) {
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id, deletedAt: null },
    });
    if (!attempt) return null;

    let assessment = curriculumService.getAssessment(attempt.assessmentId);
    if (!assessment) {
      assessment = (await this.findById(attempt.assessmentId)) as any;
    }

    return {
      ...attempt,
      assessment,
    };
  }

  async findAttemptsByChild(childId: string, assessmentId?: string) {
    const attempts = await prisma.assessmentAttempt.findMany({
      where: {
        childId,
        deletedAt: null,
        ...(assessmentId ? { assessmentId } : {}),
      },
      orderBy: { startedAt: 'desc' },
    });

    const mapped = await Promise.all(
      attempts.map(async (attempt) => {
        const assessment =
          curriculumService.getAssessment(attempt.assessmentId) ||
          (await this.findById(attempt.assessmentId));
        return {
          ...attempt,
          assessment: assessment ? { id: assessment.id, title: assessment.title } : null,
        };
      })
    );

    return mapped;
  }

  async createAttempt(childId: string, assessmentId: string) {
    return prisma.assessmentAttempt.create({
      data: { childId, assessmentId, status: 'IN_PROGRESS' },
    });
  }

  async completeAttempt(id: string, data: Prisma.AssessmentAttemptUpdateInput) {
    const attempt = await prisma.assessmentAttempt.update({
      where: { id },
      data,
    });

    const assessment =
      curriculumService.getAssessment(attempt.assessmentId) ||
      (await this.findById(attempt.assessmentId));

    return {
      ...attempt,
      assessment: assessment ? { id: assessment.id, title: assessment.title } : null,
    };
  }
}

export const assessmentsRepository = new AssessmentsRepository();
