import { prisma } from '../../config/database.js';

export class StarService {
  calculateSpeakStars(score: number): number {
    if (score < 40) return 0;
    if (score < 60) return 1;
    if (score < 80) return 2;
    return 3;
  }

  calculateWriteStars(score: number): number {
    if (score < 40) return 0;
    if (score < 60) return 1;
    if (score < 80) return 2;
    return 3;
  }

  async updateTotalStars(childId: string, tx?: any): Promise<number> {
    const client = tx || prisma;
    const lessonsProgress = await client.lessonProgress.findMany({
      where: { childId },
    });
    const storyProgress = await client.storyProgress.findMany({
      where: { childId },
    });

    const totalStars = lessonsProgress.reduce((sum: number, lp: any) => sum + lp.totalStars, 0)
      + storyProgress.reduce((sum: number, sp: any) => sum + sp.starsEarned, 0);

    // Upsert the child's Stars record
    await client.stars.upsert({
      where: { childId },
      update: { totalStars },
      create: { childId, totalStars },
    });

    return totalStars;
  }
}

export const starService = new StarService();
