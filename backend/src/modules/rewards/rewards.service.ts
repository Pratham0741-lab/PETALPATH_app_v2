import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class RewardService {
  async unlockSticker(childId: string, stickerId: string, tx?: any): Promise<void> {
    const client = tx || prisma;
    const existing = await client.childSticker.findUnique({
      where: {
        childId_stickerId: { childId, stickerId },
      },
    });

    if (!existing) {
      await client.childSticker.create({
        data: { childId, stickerId },
      });
      const sticker = await client.sticker.findUnique({ where: { id: stickerId } });
      logger.info({ childId, stickerId: sticker?.id, stickerName: sticker?.name }, 'sticker unlocked');
    }
  }

  async unlockBadge(childId: string, badgeId: string, tx?: any): Promise<void> {
    const client = tx || prisma;
    const existing = await client.childBadge.findUnique({
      where: {
        childId_badgeId: { childId, badgeId },
      },
    });

    if (!existing) {
      await client.childBadge.create({
        data: { childId, badgeId },
      });
      const badge = await client.badge.findUnique({ where: { id: badgeId } });
      logger.info({ childId, badgeId: badge?.id, badgeName: badge?.name }, 'badge earned');
    }
  }

  async refreshRewards(childId: string, tx?: any): Promise<void> {
    const client = tx || prisma;
    // 1. Fetch child stars record
    const starsRecord = await client.stars.findUnique({
      where: { childId },
    });
    const totalStars = starsRecord?.totalStars ?? 0;

    // 2. Fetch all stickers & unlock those qualifying
    const stickers = await client.sticker.findMany();
    const unlockedStickers = await client.childSticker.findMany({
      where: { childId },
    });
    const unlockedStickerIds = new Set(unlockedStickers.map((us: any) => us.stickerId));

    for (const sticker of stickers) {
      if (totalStars >= sticker.requiredStars && !unlockedStickerIds.has(sticker.id)) {
        await this.unlockSticker(childId, sticker.id, client);
      }
    }

    // 3. Fetch all badges & earned badges
    const badges = await client.badge.findMany();
    const earnedBadges = await client.childBadge.findMany({
      where: { childId },
    });
    const earnedBadgeIds = new Set(earnedBadges.map((eb: any) => eb.badgeId));

    // 4. Calculate indicators for badge eligibility
    const lessonProgresses = await client.lessonProgress.findMany({
      where: { childId, status: 'COMPLETED' },
    });
    const completedLessonsCount = lessonProgresses.length;

    // Check for perfect lesson (8/8 stars)
    const hasPerfectLesson = lessonProgresses.some((lp: any) => lp.totalStars === 8);

    // Speak progress averages
    const speakProgress = await client.speakProgress.findMany({
      where: { childId, attemptCount: { gt: 0 } },
    });
    const speakScores = speakProgress.map((p: any) => p.averageScore);
    const avgSpeakScore = speakScores.length > 0 ? (speakScores.reduce((a: any, b: any) => a + b, 0) / speakScores.length) : 0;

    // Write progress averages
    const writeProgress = await client.writeProgress.findMany({
      where: { childId, attemptCount: { gt: 0 } },
    });
    const writeScores = writeProgress.map((p: any) => p.averageScore);
    const avgWriteScore = writeScores.length > 0 ? (writeScores.reduce((a: any, b: any) => a + b, 0) / writeScores.length) : 0;

    // Category completions
    const categoryProgresses = await client.categoryProgress.findMany({
      where: { childId, isCompleted: true },
      include: { category: true },
    });
    const completedCategoryTitles = new Set(categoryProgresses.map((cp: any) => cp.category.title));

    // Evaluate each badge eligibility
    for (const badge of badges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let isEligible = false;

      switch (badge.name) {
        case 'First Lesson':
          isEligible = completedLessonsCount >= 1;
          break;
        case 'Perfect Lesson':
          isEligible = hasPerfectLesson;
          break;
        case 'Golden Speaker':
          isEligible = avgSpeakScore >= 80;
          break;
        case 'Writing Wizard':
          isEligible = avgWriteScore >= 80;
          break;
        case 'Shape Master':
          isEligible = completedCategoryTitles.has('Shapes');
          break;
        case 'Alphabet Explorer':
          isEligible = completedCategoryTitles.has('Alphabet');
          break;
        case 'Number Hero':
          isEligible = completedCategoryTitles.has('Numbers');
          break;
        case 'Reading Champion':
          isEligible = completedCategoryTitles.has('Reading Readiness');
          break;
      }

      if (isEligible) {
        await this.unlockBadge(childId, badge.id, client);
      }
    }
  }
}

export const rewardsService = new RewardService();
export const rewardService = rewardsService; // compatibility alias
