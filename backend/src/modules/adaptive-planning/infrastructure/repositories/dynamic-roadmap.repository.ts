import { prisma } from '../../../../config/database.js';
import { DynamicRoadmap } from '../../domain/entities/dynamic-roadmap.entity.js';
import { IDynamicRoadmapRepository } from '../../domain/repositories/repository-interfaces.js';

function toPrismaCreate(entity: DynamicRoadmap): Record<string, unknown> {
  return {
    id: entity.id,
    childId: entity.childId,
    roadmapJson: JSON.stringify(entity.roadmapJson),
    version: entity.version,
    generatedAt: entity.generatedAt,
    validUntil: entity.validUntil ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function toPrismaUpdate(entity: DynamicRoadmap): Record<string, unknown> {
  return {
    roadmapJson: JSON.stringify(entity.roadmapJson),
    version: entity.version,
    validUntil: entity.validUntil ?? null,
    updatedAt: entity.updatedAt,
  };
}

function mapToEntity(data: any): DynamicRoadmap {
  return new DynamicRoadmap({
    id: data.id,
    childId: data.childId,
    roadmapJson: typeof data.roadmapJson === 'string' ? JSON.parse(data.roadmapJson) : data.roadmapJson,
    version: data.version,
    generatedAt: data.generatedAt,
    validUntil: data.validUntil ?? undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export class DynamicRoadmapRepository implements IDynamicRoadmapRepository {
  async create(roadmap: DynamicRoadmap): Promise<DynamicRoadmap> {
    const created = await prisma.dynamicRoadmap.create({
      data: toPrismaCreate(roadmap) as any,
    });
    return mapToEntity(created);
  }

  async findByChildId(childId: string): Promise<DynamicRoadmap | null> {
    const data = await prisma.dynamicRoadmap.findUnique({ where: { childId } });
    return data ? mapToEntity(data) : null;
  }

  async update(roadmap: DynamicRoadmap): Promise<DynamicRoadmap> {
    const updated = await prisma.dynamicRoadmap.update({
      where: { childId: roadmap.childId },
      data: toPrismaUpdate(roadmap) as any,
    });
    return mapToEntity(updated);
  }
}