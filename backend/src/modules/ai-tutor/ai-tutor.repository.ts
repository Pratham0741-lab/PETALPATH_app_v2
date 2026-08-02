import { prisma } from '../../config/database.js';
import { Prisma, SessionBlockStatus, SessionStatus } from '@prisma/client';

export class AiTutorRepository {
  async createSessionPlan(data: Prisma.SessionPlanUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionPlan.create({ data });
  }

  async findSessionPlanById(sessionId: string) {
    return prisma.sessionPlan.findUnique({
      where: { id: sessionId },
      include: {
        sessionBlocks: { orderBy: { position: 'asc' } },
        sessionEvents: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findActiveSessionForChild(childId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionPlan.findFirst({
      where: { childId, status: { in: [SessionStatus.STARTED, SessionStatus.PAUSED] } },
      include: {
        sessionBlocks: { orderBy: { position: 'asc' } },
      },
    });
  }

  async updateSessionPlan(
    sessionId: string,
    data: Prisma.SessionPlanUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.sessionPlan.update({ where: { id: sessionId }, data });
  }

  async createSessionBlock(data: Prisma.SessionBlockUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionBlock.create({ data });
  }

  async completeBlockIfPending(blockId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionBlock.updateMany({
      where: { id: blockId, status: SessionBlockStatus.PENDING },
      data: { status: SessionBlockStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async skipPendingBlocksForSession(sessionId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionBlock.updateMany({
      where: { sessionPlanId: sessionId, status: SessionBlockStatus.PENDING },
      data: { status: SessionBlockStatus.SKIPPED },
    });
  }

  async createSessionEvent(data: Prisma.SessionEventUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionEvent.create({ data });
  }

  async findNextIncompleteBlock(sessionId: string) {
    return prisma.sessionBlock.findFirst({
      where: { sessionPlanId: sessionId, status: SessionBlockStatus.PENDING },
      orderBy: { position: 'asc' },
      include: { skill: { select: { name: true } } },
    });
  }

  async countCompletedBlocks(sessionId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionBlock.count({
      where: { sessionPlanId: sessionId, status: SessionBlockStatus.COMPLETED },
    });
  }

  async countTotalBlocks(sessionId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.sessionBlock.count({
      where: { sessionPlanId: sessionId },
    });
  }
}

export const aiTutorRepository = new AiTutorRepository();
