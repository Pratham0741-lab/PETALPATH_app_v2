import { prisma } from '../../../../config/database.js';
import { DynamicRoadmap } from '../../domain/entities/dynamic-roadmap.entity.js';
import { IDynamicRoadmapRepository } from '../../domain/repositories/repository-interfaces.js';

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
      data: roadmap.toPrismaCreate(),
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
      data: roadmap.toPrismaUpdate(),
    });
    return mapToEntity(updated);
  }
}