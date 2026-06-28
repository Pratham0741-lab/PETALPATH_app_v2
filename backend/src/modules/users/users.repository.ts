import { prisma } from '../../config/database.js';

export class UsersRepository {
  async findAll() {
    return prisma.user.findMany({
      where: { deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findByGoogleId(googleId: string) {
    return prisma.user.findFirst({
      where: { googleId, deletedAt: null },
    });
  }

  async findByResetToken(token: string) {
    return prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
        deletedAt: null,
      },
    });
  }

  async create(data: any) {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const usersRepository = new UsersRepository();
