import { prisma } from '../../config/database.js';

export class StoriesRepository {
  async findAll() {
    return prisma.story.findMany({
      where: { deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.story.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByChildId(childId: string) {
    return prisma.story.findMany({
      where: { childId, deletedAt: null },
    });
  }

  async create(data: any) {
    return prisma.story.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.story.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.story.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const storiesRepository = new StoriesRepository();
