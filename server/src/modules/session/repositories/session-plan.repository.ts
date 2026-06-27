import { prisma } from '../../../config/database.js';
import { SessionStatus } from '../../../shared/enums.js';

export class SessionPlanRepository {
  async create(data: { childId: string; durationMinutes: number }) {
    return prisma.sessionPlan.create({
      data: {
        childId: data.childId,
        durationMinutes: data.durationMinutes,
        status: SessionStatus.GENERATED,
      },
      include: {
        sessionBlocks: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.sessionPlan.findUnique({
      where: { id },
      include: {
        sessionBlocks: {
          orderBy: { position: 'asc' },
          include: {
            skill: true,
            subject: true,
          },
        },
        sessionEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByChild(childId: string) {
    return prisma.sessionPlan.findMany({
      where: { childId },
      include: {
        sessionBlocks: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveSession(childId: string) {
    return prisma.sessionPlan.findFirst({
      where: {
        childId,
        status: {
          in: [SessionStatus.GENERATED, SessionStatus.STARTED, SessionStatus.PAUSED],
        },
      },
      include: {
        sessionBlocks: {
          orderBy: { position: 'asc' },
          include: {
            skill: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    timestamps?: { startedAt?: Date; completedAt?: Date }
  ) {
    return prisma.sessionPlan.update({
      where: { id },
      data: {
        status,
        ...(timestamps?.startedAt && { startedAt: timestamps.startedAt }),
        ...(timestamps?.completedAt && { completedAt: timestamps.completedAt }),
      },
      include: {
        sessionBlocks: true,
      },
    });
  }

  async findHistory(childId: string, limit = 20) {
    return prisma.sessionPlan.findMany({
      where: { childId },
      include: {
        sessionBlocks: {
          orderBy: { position: 'asc' },
          include: {
            skill: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const sessionPlanRepository = new SessionPlanRepository();
