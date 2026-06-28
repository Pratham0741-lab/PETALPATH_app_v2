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

  async updateTotalStars(childId: string): Promise<number> {
    // Sum total stars of completed lesson progress records
    const lessonsProgress = await prisma.lessonProgress.findMany({
      where: { childId },
    });

    const totalStars = lessonsProgress.reduce((sum, lp) => sum + lp.totalStars, 0);

    // Upsert the child's Stars record
    await prisma.stars.upsert({
      where: { childId },
      update: { totalStars },
      create: { childId, totalStars },
    });

    return totalStars;
  }
}

export const starService = new StarService();
