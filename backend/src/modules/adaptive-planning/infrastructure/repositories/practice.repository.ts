import { prisma } from '../../../../config/database.js';
import { Practice } from '../../domain/entities/practice.entity.js';
import { IPracticeRepository } from '../../domain/repositories/repository-interfaces.js';
import { PracticeType } from '../../domain/value-objects/planning-types.js';

function toPrismaCreate(entity: Practice): Record<string, unknown> {
  return {
    id: entity.id,
    childId: entity.childId,
    topicId: entity.topicId,
    modality: entity.modality ?? null,
    type: entity.type,
    debtId: entity.debtId ?? null,
    scheduledFor: entity.scheduledFor,
    completedAt: entity.completedAt ?? null,
    completed: entity.completed,
    createdAt: entity.createdAt,
  };
}

function toPrismaUpdate(entity: Practice): Record<string, unknown> {
  return {
    topicId: entity.topicId,
    modality: entity.modality ?? null,
    type: entity.type,
    debtId: entity.debtId ?? null,
    scheduledFor: entity.scheduledFor,
    completedAt: entity.completedAt ?? null,
    completed: entity.completed,
  };
}

function mapToEntity(data: any): Practice {
  return new Practice({
    id: data.id,
    childId: data.childId,
    topicId: data.topicId,
    modality: data.modality ?? undefined,
    type: data.type as PracticeType,
    debtId: data.debtId ?? undefined,
    scheduledFor: data.scheduledFor,
    completedAt: data.completedAt ?? undefined,
    completed: data.completed,
    createdAt: data.createdAt,
  });
}

export class PracticeRepository implements IPracticeRepository {
  async create(practice: Practice): Promise<Practice> {
    const created = await prisma.practice.create({
      data: toPrismaCreate(practice) as any,
    });
    return mapToEntity(created);
  }

  async findById(id: string): Promise<Practice | null> {
    const data = await prisma.practice.findUnique({ where: { id } });
    return data ? mapToEntity(data) : null;
  }

  async findByChildId(childId: string, limit?: number, offset?: number): Promise<Practice[]> {
    const data = await prisma.practice.findMany({
      where: { childId },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
      skip: offset,
    });
    return data.map(mapToEntity);
  }

  async findByChildIdAndType(childId: string, type: string, limit?: number, offset?: number): Promise<Practice[]> {
    const data = await prisma.practice.findMany({
      where: { childId, type: type as any },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
      skip: offset,
    });
    return data.map(mapToEntity);
  }

  async findByChildIdAndDateRange(childId: string, from: Date, to: Date): Promise<Practice[]> {
    const data = await prisma.practice.findMany({
      where: {
        childId,
        scheduledFor: { gte: from, lte: to },
      },
      orderBy: { scheduledFor: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async findByChildIdAndTopicId(childId: string, topicId: string): Promise<Practice[]> {
    const data = await prisma.practice.findMany({
      where: { childId, topicId },
      orderBy: { scheduledFor: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async findPendingByChildId(childId: string): Promise<Practice[]> {
    const data = await prisma.practice.findMany({
      where: { childId, completed: false },
      orderBy: { scheduledFor: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async findByDebtId(debtId: string): Promise<Practice[]> {
    const data = await prisma.practice.findMany({
      where: { debtId },
      orderBy: { scheduledFor: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async update(practice: Practice): Promise<Practice> {
    const updated = await prisma.practice.update({
      where: { id: practice.id },
      data: toPrismaUpdate(practice) as any,
    });
    return mapToEntity(updated);
  }
}