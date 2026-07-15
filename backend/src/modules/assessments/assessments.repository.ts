import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

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
    return prisma.assessmentAttempt.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
      },
    });
  }

  async findAttemptsByChild(childId: string, assessmentId?: string) {
    return prisma.assessmentAttempt.findMany({
      where: {
        childId,
        deletedAt: null,
        ...(assessmentId ? { assessmentId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      include: {
        assessment: {
          select: { id: true, title: true },
        },
      },
    });
  }

  async createAttempt(childId: string, assessmentId: string) {
    return prisma.assessmentAttempt.create({
      data: { childId, assessmentId, status: 'IN_PROGRESS' },
    });
  }

  async completeAttempt(id: string, data: Prisma.AssessmentAttemptUpdateInput) {
    return prisma.assessmentAttempt.update({
      where: { id },
      data,
      include: {
        assessment: {
          select: { id: true, title: true },
        },
      },
    });
  }
}

export const assessmentsRepository = new AssessmentsRepository();
