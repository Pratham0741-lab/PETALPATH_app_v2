import { prisma } from '../../../../config/database.js';
import { TopicState } from '../../domain/entities/topic-state.entity.js';
import { ITopicStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { TopicStateType, ModalityStateType } from '../../domain/value-objects/intelligence-types.js';

function toPrismaCreate(entity: TopicState): Record<string, unknown> {
  return {
    id: entity.id,
    childId: entity.childId,
    topicId: entity.topicId,
    state: entity.state,
    modalityStates: entity.modalityStates,
    enteredAt: entity.enteredAt,
    lastTransitionAt: entity.lastTransitionAt,
    transitionReason: entity.transitionReason ?? null,
    evidenceSummary: entity.evidenceSummary ?? null,
    createdAt: entity.createdAt,
  };
}

function mapToEntity(data: any): TopicState {
  return new TopicState({
    id: data.id,
    childId: data.childId,
    topicId: data.topicId,
    state: data.state as TopicStateType,
    modalityStates: data.modalityStates as Record<string, ModalityStateType>,
    enteredAt: data.enteredAt,
    lastTransitionAt: data.lastTransitionAt,
    transitionReason: data.transitionReason ?? undefined,
    evidenceSummary: data.evidenceSummary as Record<string, unknown> | undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class TopicStateRepository implements ITopicStateRepository {
  async create(topicState: TopicState): Promise<TopicState> {
    const created = await prisma.topicState.create({
      data: toPrismaCreate(topicState) as any,
    });
    return mapToEntity(created);
  }

  async findById(id: string): Promise<TopicState | null> {
    const data = await prisma.topicState.findUnique({ where: { id } });
    return data ? mapToEntity(data) : null;
  }

  async findByChildAndTopic(childId: string, topicId: string): Promise<TopicState | null> {
    const data = await prisma.topicState.findUnique({
      where: { childId_topicId: { childId, topicId } },
    });
    return data ? mapToEntity(data) : null;
  }

  async findByChildId(childId: string): Promise<TopicState[]> {
    const data = await prisma.topicState.findMany({
      where: { childId },
      orderBy: { updatedAt: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async update(topicState: TopicState): Promise<TopicState> {
    const updated = await prisma.topicState.update({
      where: { id: topicState.id },
      data: toPrismaCreate(topicState) as any,
    });
    return mapToEntity(updated);
  }
}