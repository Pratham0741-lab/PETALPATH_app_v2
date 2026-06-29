import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

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

  async create(data: Prisma.MentorCreateInput) {
    return prisma.mentor.create({
      data,
    });
  }
}

export const mentorsRepository = new MentorsRepository();
