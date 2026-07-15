import { prisma } from '../../../../config/database.js';
import { LearningEvidence, LearningEvidenceProps } from '../../domain/entities/learning-evidence.entity.js';
import { ILearningEvidenceRepository } from '../../domain/repositories/repository-interfaces.js';
import { Modality, EvidenceType } from '../../domain/value-objects/event-types.js';

function toPrismaCreate(entity: LearningEvidence): Record<string, unknown> {
  return {
    id: entity.id,
    eventId: entity.eventId,
    childId: entity.childId,
    sessionId: entity.sessionId,
    activityId: entity.activityId,
    topicId: entity.topicId,
    modality: entity.modality,
    evidenceType: entity.evidenceType,
    observation: JSON.stringify(entity.observation),
    createdAt: entity.createdAt,
  };
}

function mapToEntity(data: any): LearningEvidence {
  return new LearningEvidence({
    id: data.id as string,
    eventId: data.eventId as string,
    childId: data.childId as string,
    sessionId: data.sessionId as string,
    activityId: data.activityId as string | undefined,
    topicId: data.topicId as string | undefined,
    modality: data.modality as Modality | undefined,
    evidenceType: data.evidenceType as EvidenceType,
    observation: (data.observation as Record<string, unknown>) ?? {},
    createdAt: data.createdAt as Date,
  });
}

export class LearningEvidenceRepository implements ILearningEvidenceRepository {
  async create(evidence: LearningEvidence): Promise<LearningEvidence> {
    const created = await prisma.learningEvidence.create({
      data: toPrismaCreate(evidence) as any,
    });
    return mapToEntity(created);
  }

  async findByEventId(eventId: string): Promise<LearningEvidence | null> {
    const data = await prisma.learningEvidence.findFirst({
      where: { eventId },
    });
    return data ? mapToEntity(data) : null;
  }

  async findByChildId(childId: string, limit = 100, offset = 0): Promise<LearningEvidence[]> {
    const data = await prisma.learningEvidence.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return data.map(mapToEntity);
  }

  async findBySessionId(sessionId: string): Promise<LearningEvidence[]> {
    const data = await prisma.learningEvidence.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return data.map(mapToEntity);
  }

  async findByActivityId(activityId: string): Promise<LearningEvidence[]> {
    const data = await prisma.learningEvidence.findMany({
      where: { activityId },
      orderBy: { createdAt: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async findByTopicId(topicId: string): Promise<LearningEvidence[]> {
    const data = await prisma.learningEvidence.findMany({
      where: { topicId },
      orderBy: { createdAt: 'desc' },
    });
    return data.map(mapToEntity);
  }

  async findByEvidenceType(childId: string, evidenceType: string): Promise<LearningEvidence[]> {
    const data = await prisma.learningEvidence.findMany({
      where: { childId, evidenceType: evidenceType as any },
      orderBy: { createdAt: 'desc' },
    });
    return data.map(mapToEntity);
  }
}