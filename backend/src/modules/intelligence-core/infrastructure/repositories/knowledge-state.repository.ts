import { prisma } from '../../../../config/database.js';
import { KnowledgeState } from '../../domain/entities/knowledge-state.entity.js';
import { IKnowledgeStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { KnowledgeStateType, ModalityStateType } from '../../domain/value-objects/intelligence-types.js';

function toPrismaCreate(entity: KnowledgeState): Record<string, unknown> {
  return {
    id: entity.id,
    childId: entity.childId,
    topicId: entity.topicId,
    state: entity.state,
    confidence: entity.confidence,
    modalityCoverage: entity.modalityCoverage,
    enteredAt: entity.enteredAt,
    lastTransitionAt: entity.lastTransitionAt,
    transitionReason: entity.transitionReason ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function mapToEntity(data: any): KnowledgeState {
  return new KnowledgeState({
    id: data.id,
    childId: data.childId,
    topicId: data.topicId,
    state: data.state as KnowledgeStateType,
    confidence: data.confidence,
    modalityCoverage: data.modalityCoverage as Record<string, ModalityStateType>,
    enteredAt: data.enteredAt,
    lastTransitionAt: data.lastTransitionAt,
    transitionReason: data.transitionReason ?? undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class KnowledgeStateRepository implements IKnowledgeStateRepository {
  async create(knowledgeState: KnowledgeState): Promise<KnowledgeState> {
    const created = await prisma.knowledgeState.create({
      data: toPrismaCreate(knowledgeState) as any,
    });
    return mapToEntity(created);
  }

  async findByChildAndTopic(childId: string, topicId: string): Promise<KnowledgeState | null> {
    const data = await prisma.knowledgeState.findUnique({
      where: { childId_topicId: { childId, topicId } },
    });
    return data ? mapToEntity(data) : null;
  }

  async findByChildId(childId: string): Promise<KnowledgeState[]> {
    const data = await prisma.knowledgeState.findMany({
      where: { childId },
      orderBy: { updatedAt: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async update(knowledgeState: KnowledgeState): Promise<KnowledgeState> {
    const updated = await prisma.knowledgeState.update({
      where: { id: knowledgeState.id },
      data: toPrismaCreate(knowledgeState) as any,
    });
    return mapToEntity(updated);
  }
}