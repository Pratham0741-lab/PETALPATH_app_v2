import { prisma } from '../../config/database.js';

export class MentorsRepository {
  async findAll() {
    return prisma.mentor.findMany({
      where: { deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.mentor.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: any) {
    return prisma.mentor.create({
      data,
    });
  }
}

export const mentorsRepository = new MentorsRepository();
