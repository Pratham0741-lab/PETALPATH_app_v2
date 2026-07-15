import { prisma } from '../../../../config/database.js';
import { LearningDebt } from '../../domain/entities/learning-debt.entity.js';
import { ILearningDebtRepository } from '../../domain/repositories/repository-interfaces.js';

function toPrismaCreate(entity: LearningDebt): Record<string, unknown> {
  return {
    id: entity.id,
    childId: entity.childId,
    topicId: entity.topicId,
    modality: entity.modality ?? null,
    debtType: entity.debtType,
    severity: entity.severity,
    description: entity.description,
    createdAt: entity.createdAt,
    resolvedAt: entity.resolvedAt ?? null,
    resolved: entity.resolved,
  };
}

function toPrismaUpdate(entity: LearningDebt): Record<string, unknown> {
  return {
    topicId: entity.topicId,
    modality: entity.modality ?? null,
    debtType: entity.debtType,
    severity: entity.severity,
    description: entity.description,
    resolvedAt: entity.resolvedAt ?? null,
    resolved: entity.resolved,
  };
}

function mapToEntity(data: any): LearningDebt {
  return new LearningDebt({
    id: data.id,
    childId: data.childId,
    topicId: data.topicId,
    modality: data.modality ?? undefined,
    debtType: data.debtType,
    severity: data.severity,
    description: data.description,
    createdAt: data.createdAt,
    resolvedAt: data.resolvedAt ?? undefined,
    resolved: data.resolved,
  });
}

export class LearningDebtRepository implements ILearningDebtRepository {
  async create(debt: LearningDebt): Promise<LearningDebt> {
    const created = await prisma.learningDebt.create({
      data: toPrismaCreate(debt) as any,
    });
    return mapToEntity(created);
  }

  async findById(id: string): Promise<LearningDebt | null> {
    const data = await prisma.learningDebt.findUnique({ where: { id } });
    return data ? mapToEntity(data) : null;
  }

  async findByChildId(childId: string): Promise<LearningDebt[]> {
    const data = await prisma.learningDebt.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async findByChildAndTopic(childId: string, topicId: string): Promise<LearningDebt[]> {
    const data = await prisma.learningDebt.findMany({
      where: { childId, topicId },
      orderBy: { createdAt: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async findUnresolvedByChildId(childId: string): Promise<LearningDebt[]> {
    const data = await prisma.learningDebt.findMany({
      where: { childId, resolved: false },
      orderBy: { createdAt: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async resolve(debtId: string): Promise<LearningDebt> {
    const updated = await prisma.learningDebt.update({
      where: { id: debtId },
      data: { resolved: true, resolvedAt: new Date() },
    });
    return mapToEntity(updated);
  }

  async update(debt: LearningDebt): Promise<LearningDebt> {
    const updated = await prisma.learningDebt.update({
      where: { id: debt.id },
      data: toPrismaUpdate(debt) as any,
    });
    return mapToEntity(updated);
  }
}