import { prisma } from '../../../../config/database.js';
import { SessionBlock } from '../../domain/entities/session-block.entity.js';
import { SessionBlockType, ActivityType, DifficultyLevel } from '../../domain/value-objects/planning-types.js';
import { SessionBlockStatus } from '../../domain/entities/session-block.entity.js';
import { ISessionBlockRepository } from '../../domain/repositories/repository-interfaces.js';

function toPrismaCreate(entity: SessionBlock): Record<string, unknown> {
  return {
    id: entity.id,
    sessionPlanId: entity.sessionPlanId,
    skillId: null,
    subjectId: null,
    activityType: entity.activityType,
    difficulty: entity.difficulty,
    estimatedMinutes: entity.estimatedMinutes,
    position: entity.order,
    status: entity.status,
    isReinforcement: entity.isReinforcement,
    metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
    createdAt: entity.createdAt,
  };
}

function toPrismaUpdate(entity: SessionBlock): Record<string, unknown> {
  return {
    activityType: entity.activityType,
    difficulty: entity.difficulty,
    estimatedMinutes: entity.estimatedMinutes,
    position: entity.order,
    status: entity.status,
    isReinforcement: entity.isReinforcement,
    metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
  };
}

function mapToEntity(data: any): SessionBlock {
  return new SessionBlock({
    id: data.id,
    sessionPlanId: data.sessionPlanId,
    type: data.type as SessionBlockType,
    topicId: undefined,
    modality: undefined,
    activityType: data.activityType as ActivityType,
    difficulty: data.difficulty as DifficultyLevel,
    estimatedMinutes: data.estimatedMinutes,
    effortLevel: 1,
    order: data.position,
    isReinforcement: data.isReinforcement ?? false,
    metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.createdAt,
    status: data.status as SessionBlockStatus,
  });
}

export class SessionBlockRepository implements ISessionBlockRepository {
  async create(sessionBlock: SessionBlock): Promise<SessionBlock> {
    const created = await prisma.sessionBlock.create({
      data: toPrismaCreate(sessionBlock) as any,
    });
    return mapToEntity(created);
  }

  async findById(id: string): Promise<SessionBlock | null> {
    const data = await prisma.sessionBlock.findUnique({ where: { id } });
    return data ? mapToEntity(data) : null;
  }

  async findBySessionPlanId(sessionPlanId: string): Promise<SessionBlock[]> {
    const data = await prisma.sessionBlock.findMany({
      where: { sessionPlanId },
      orderBy: { position: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async updateStatus(id: string, status: SessionBlockStatus, completedAt?: Date): Promise<SessionBlock> {
    const updated = await prisma.sessionBlock.update({
      where: { id },
      data: { status, completedAt } as any,
    });
    return mapToEntity(updated);
  }

  async update(sessionBlock: SessionBlock): Promise<SessionBlock> {
    const updated = await prisma.sessionBlock.update({
      where: { id: sessionBlock.id },
      data: toPrismaUpdate(sessionBlock) as any,
    });
    return mapToEntity(updated);
  }
}