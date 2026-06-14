import { prisma } from '../../config/database.js';

export class RefreshTokenRepository {
  async findToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async createToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async deleteToken(token: string) {
    return prisma.refreshToken.delete({
      where: { token },
    });
  }

  async deleteUserTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
