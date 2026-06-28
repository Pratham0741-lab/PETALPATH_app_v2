import { prisma } from '../../config/database.js';

export class RewardsRepository {
  async findAll() {
    return prisma.reward.findMany({
      where: { deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.reward.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByChildId(childId: string) {
    return prisma.reward.findMany({
      where: { childId, deletedAt: null },
    });
  }

  async create(data: any) {
    return prisma.reward.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.reward.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.reward.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const rewardsRepository = new RewardsRepository();
