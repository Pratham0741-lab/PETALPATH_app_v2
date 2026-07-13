import { prisma } from '../../../../config/database.js';
import { LearningState } from '../../domain/entities/learning-state.entity.js';
import { IStateRepository } from '../../domain/repositories/repository-interfaces.js';
import { Modality } from '../../../../shared/enums.js';

function mapToEntity(data: any): LearningState {
  return new LearningState({
    id: data.id,
    childId: data.childId,
    topicId: data.topicId,
    mastery: data.mastery,
    confidence: data.confidence,
    stability: data.stability,
    forgettingRate: data.forgettingRate,
    reviewIntervalDays: data.reviewIntervalDays,
    lastReviewedAt: data.lastReviewedAt ?? null,
    lastPracticedAt: data.lastPracticedAt ?? null,
    correctAttempts: data.correctAttempts,
    incorrectAttempts: data.incorrectAttempts,
    streak: data.streak,
    totalAttempts: data.totalAttempts,
    averageResponseTimeMs: data.averageResponseTimeMs,
    hintUsage: data.hintUsage,
    retryCount: data.retryCount,
    currentDifficulty: data.currentDifficulty,
    currentModality: (data.currentModality as Modality) ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class StateRepository implements IStateRepository {
  async findByChildId(childId: string): Promise<LearningState[]> {
    const rows = await prisma.knowledgeState.findMany({
      where: { childId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(mapToEntity);
  }

  async findByTopic(childId: string, topicId: string): Promise<LearningState | null> {
    const data = await prisma.knowledgeState.findUnique({
      where: { childId_topicId: { childId, topicId } },
    });
    return data ? mapToEntity(data) : null;
  }

  async save(state: LearningState): Promise<LearningState> {
    const created = await prisma.knowledgeState.create({
      data: state.toPrismaCreate() as any,
    });
    return mapToEntity(created);
  }

  async update(state: LearningState): Promise<LearningState> {
    const updated = await prisma.knowledgeState.update({
      where: { id: state.id },
      data: state.toPrismaUpdate() as any,
    });
    return mapToEntity(updated);
  }
}
