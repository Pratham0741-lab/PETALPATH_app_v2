import { prisma } from '../../../../config/database.js';
import { SessionPlan, SessionStatus } from '../../domain/entities/session-plan.entity.js';
import { ISessionPlanRepository } from '../../domain/repositories/repository-interfaces.js';

function mapToEntity(data: any): SessionPlan {
  return new SessionPlan({
    id: data.id,
    childId: data.childId,
    durationMinutes: data.durationMinutes,
    status: data.status,
    roadmapId: data.roadmapId ?? undefined,
    startedAt: data.startedAt ?? undefined,
    completedAt: data.completedAt ?? undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    sessionBlocks: [],
  });
}

export class SessionPlanRepository implements ISessionPlanRepository {
  async create(sessionPlan: SessionPlan): Promise<SessionPlan> {
    const created = await prisma.sessionPlan.create({
      data: sessionPlan.toPrismaCreate() as any,
    });
    return mapToEntity(created);
  }

  async findById(id: string): Promise<SessionPlan | null> {
    const data = await prisma.sessionPlan.findUnique({ where: { id } });
    return data ? mapToEntity(data) : null;
  }

  async findByChildId(childId: string, limit?: number, offset?: number): Promise<SessionPlan[]> {
    const data = await prisma.sessionPlan.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return data.map(mapToEntity);
  }

  async findActiveByChildId(childId: string): Promise<SessionPlan | null> {
    const data = await prisma.sessionPlan.findFirst({
      where: { childId, status: { in: ['GENERATED', 'STARTED', 'PAUSED'] } },
      orderBy: { createdAt: 'desc' },
    });
    return data ? mapToEntity(data) : null;
  }

  async updateStatus(id: string, status: SessionStatus, data?: any): Promise<SessionPlan> {
    const updated = await prisma.sessionPlan.update({
      where: { id },
      data: { status, ...data } as any,
    });
    return mapToEntity(updated);
  }

  async update(sessionPlan: SessionPlan): Promise<SessionPlan> {
    const updated = await prisma.sessionPlan.update({
      where: { id: sessionPlan.id },
      data: sessionPlan.toPrismaUpdate() as any,
    });
    return mapToEntity(updated);
  }
}