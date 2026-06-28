import { prisma } from '../../config/database.js';

export class ListenProgressRepository {
  async findProgress(childId: string, activityId: string) {
    return prisma.listenProgress.findUnique({
      where: {
        childId_activityId: {
          childId,
          activityId,
        },
      },
    });
  }

  async upsertProgress(childId: string, activityId: string, data: { isCompleted: boolean; attemptCount?: number }) {
    const existing = await this.findProgress(childId, activityId);
    const attemptCount = data.attemptCount ?? (existing ? existing.attemptCount + 1 : 1);

    return prisma.listenProgress.upsert({
      where: {
        childId_activityId: {
          childId,
          activityId,
        },
      },
      update: {
        isCompleted: data.isCompleted,
        attemptCount,
      },
      create: {
        childId,
        activityId,
        isCompleted: data.isCompleted,
        attemptCount,
      },
    });
  }

  async completeListen(childId: string, activityId: string) {
    const existing = await this.findProgress(childId, activityId);
    const attemptCount = existing ? existing.attemptCount + 1 : 1;

    return prisma.listenProgress.upsert({
      where: {
        childId_activityId: {
          childId,
          activityId,
        },
      },
      update: {
        isCompleted: true,
        attemptCount,
      },
      create: {
        childId,
        activityId,
        isCompleted: true,
        attemptCount,
      },
    });
  }
}

export const listenProgressRepository = new ListenProgressRepository();
