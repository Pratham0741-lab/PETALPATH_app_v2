import { prisma } from '../../config/database.js';

export class CategoriesRepository {
  async findAll() {
    return prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: any) {
    return prisma.category.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const categoriesRepository = new CategoriesRepository();
