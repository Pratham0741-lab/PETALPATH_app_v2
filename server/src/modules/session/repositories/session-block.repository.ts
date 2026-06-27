import { prisma } from '../../../config/database.js';
import { SessionBlockStatus, ActivityType, DifficultyLevel } from '../../../shared/enums.js';

export class SessionBlockRepository {
  async create(data: {
    sessionPlanId: string;
    skillId?: string | null;
    subjectId?: string | null;
    activityType: ActivityType;
    difficulty: DifficultyLevel;
    estimatedMinutes: number;
    position: number;
  }) {
    return prisma.sessionBlock.create({
      data: {
        sessionPlanId: data.sessionPlanId,
        skillId: data.skillId || null,
        subjectId: data.subjectId || null,
        activityType: data.activityType,
        difficulty: data.difficulty,
        estimatedMinutes: data.estimatedMinutes,
        position: data.position,
        status: SessionBlockStatus.PENDING,
      },
    });
  }

  async updateStatus(id: string, status: SessionBlockStatus, completedAt?: Date) {
    return prisma.sessionBlock.update({
      where: { id },
      data: {
        status,
        ...(completedAt && { completedAt }),
      },
    });
  }

  async findBlocksByPlanId(sessionPlanId: string) {
    return prisma.sessionBlock.findMany({
      where: { sessionPlanId },
      orderBy: { position: 'asc' },
      include: {
        skill: true,
        subject: true,
      },
    });
  }
}

export const sessionBlockRepository = new SessionBlockRepository();
