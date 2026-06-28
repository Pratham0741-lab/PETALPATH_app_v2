import { prisma } from '../../config/database.js';

export class ModulesRepository {
  async findAll() {
    return prisma.module.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.module.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByCategoryId(categoryId: string) {
    return prisma.module.findMany({
      where: { categoryId, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async create(data: any) {
    return prisma.module.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.module.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.module.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const modulesRepository = new ModulesRepository();
