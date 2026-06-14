import { prisma } from '../../config/database.js';

export class ChildrenRepository {
  async findAllByUserId(userId: string) {
    return prisma.child.findMany({
      where: { userId, deletedAt: null },
      include: { mentor: true },
    });
  }

  async findById(id: string) {
    return prisma.child.findFirst({
      where: { id, deletedAt: null },
      include: { mentor: true },
    });
  }

  async create(data: any) {
    return prisma.child.create({
      data,
      include: { mentor: true },
    });
  }

  async update(id: string, data: any) {
    return prisma.child.update({
      where: { id },
      data,
      include: { mentor: true },
    });
  }

  async delete(id: string) {
    return prisma.child.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const childrenRepository = new ChildrenRepository();
