import { prisma } from '../../../../config/database.js';
import { ReinforcementQueue } from '../../domain/entities/reinforcement-queue.entity.js';
import { IReinforcementQueueRepository } from '../../domain/repositories/repository-interfaces.js';
import { Modality } from '../../../../shared/enums.js';

function toPrismaCreate(entity: ReinforcementQueue): Record<string, unknown> {
  return {
    id: entity.id,
    child: { connect: { id: entity.childId } },
    topicId: entity.topicId,
    modality: entity.modality ?? null,
    startedAt: entity.startedAt,
    nextReviewAt: entity.nextReviewAt,
    reviewFrequency: entity.reviewFrequency,
    reviewCount: entity.reviewCount,
    successfulReviews: entity.successfulReviews,
    status: entity.status,
    priority: entity.priority,
  };
}

function toPrismaUpdate(entity: ReinforcementQueue): Record<string, unknown> {
  return {
    topicId: entity.topicId,
    modality: entity.modality ?? null,
    startedAt: entity.startedAt,
    nextReviewAt: entity.nextReviewAt,
    reviewFrequency: entity.reviewFrequency,
    reviewCount: entity.reviewCount,
    successfulReviews: entity.successfulReviews,
    status: entity.status,
    priority: entity.priority,
  };
}

function mapToEntity(data: any): ReinforcementQueue {
  return new ReinforcementQueue({
    id: data.id,
    childId: data.childId,
    topicId: data.topicId,
    modality: data.modality as Modality ?? undefined,
    startedAt: data.startedAt,
    nextReviewAt: data.nextReviewAt,
    reviewFrequency: data.reviewFrequency,
    reviewCount: data.reviewCount,
    successfulReviews: data.successfulReviews,
    status: data.status,
    priority: data.priority,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class ReinforcementQueueRepository implements IReinforcementQueueRepository {
  async create(queue: ReinforcementQueue): Promise<ReinforcementQueue> {
    const created = await prisma.topicReinforcementQueue.create({
      data: toPrismaCreate(queue) as any,
    });
    return mapToEntity(created);
  }

  async findByChildAndTopic(childId: string, topicId: string, modality?: Modality): Promise<ReinforcementQueue | null> {
    const data = await prisma.topicReinforcementQueue.findFirst({
      where: { childId, topicId, modality: modality ?? null },
    });
    return data ? mapToEntity(data) : null;
  }

  async findDueReviews(childId: string, beforeDate: Date): Promise<ReinforcementQueue[]> {
    const data = await prisma.topicReinforcementQueue.findMany({
      where: { childId, nextReviewAt: { lte: beforeDate }, status: 'ACTIVE' },
      orderBy: { nextReviewAt: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async findActiveByChild(childId: string): Promise<ReinforcementQueue[]> {
    const data = await prisma.topicReinforcementQueue.findMany({
      where: { childId, status: 'ACTIVE' },
      orderBy: { nextReviewAt: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async update(queue: ReinforcementQueue): Promise<ReinforcementQueue> {
    const updated = await prisma.topicReinforcementQueue.update({
      where: { id: queue.id },
      data: toPrismaUpdate(queue) as any,
    });
    return mapToEntity(updated);
  }
}