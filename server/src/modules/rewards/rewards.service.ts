import { prisma } from '../../config/database.js';

export class RewardService {
  async unlockSticker(childId: string, stickerId: string): Promise<void> {
    const existing = await prisma.childSticker.findUnique({
      where: {
        childId_stickerId: { childId, stickerId },
      },
    });

    if (!existing) {
      await prisma.childSticker.create({
        data: { childId, stickerId },
      });
      const sticker = await prisma.sticker.findUnique({ where: { id: stickerId } });
      console.log(`[STICKER UNLOCKED] Child ${childId} unlocked sticker "${sticker?.name}"`);
    }
  }

  async unlockBadge(childId: string, badgeId: string): Promise<void> {
    const existing = await prisma.childBadge.findUnique({
      where: {
        childId_badgeId: { childId, badgeId },
      },
    });

    if (!existing) {
      await prisma.childBadge.create({
        data: { childId, badgeId },
      });
      const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
      console.log(`[BADGE EARNED] Child ${childId} earned badge "${badge?.name}"`);
    }
  }

  async refreshRewards(childId: string): Promise<void> {
    // 1. Fetch child stars record
    const starsRecord = await prisma.stars.findUnique({
      where: { childId },
    });
    const totalStars = starsRecord?.totalStars ?? 0;

    // 2. Fetch all stickers & unlock those qualifying
    const stickers = await prisma.sticker.findMany();
    const unlockedStickers = await prisma.childSticker.findMany({
      where: { childId },
    });
    const unlockedStickerIds = new Set(unlockedStickers.map((us) => us.stickerId));

    for (const sticker of stickers) {
      if (totalStars >= sticker.requiredStars && !unlockedStickerIds.has(sticker.id)) {
        await this.unlockSticker(childId, sticker.id);
      }
    }

    // 3. Fetch all badges & earned badges
    const badges = await prisma.badge.findMany();
    const earnedBadges = await prisma.childBadge.findMany({
      where: { childId },
    });
    const earnedBadgeIds = new Set(earnedBadges.map((eb) => eb.badgeId));

    // 4. Calculate indicators for badge eligibility
    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: { childId, status: 'COMPLETED' },
    });
    const completedLessonsCount = lessonProgresses.length;

    // Check for perfect lesson (8/8 stars)
    const hasPerfectLesson = lessonProgresses.some((lp) => lp.totalStars === 8);

    // Speak progress averages
    const speakProgress = await prisma.speakProgress.findMany({
      where: { childId, attemptCount: { gt: 0 } },
    });
    const speakScores = speakProgress.map((p) => p.averageScore);
    const avgSpeakScore = speakScores.length > 0 ? (speakScores.reduce((a, b) => a + b, 0) / speakScores.length) : 0;

    // Write progress averages
    const writeProgress = await prisma.writeProgress.findMany({
      where: { childId, attemptCount: { gt: 0 } },
    });
    const writeScores = writeProgress.map((p) => p.averageScore);
    const avgWriteScore = writeScores.length > 0 ? (writeScores.reduce((a, b) => a + b, 0) / writeScores.length) : 0;

    // Category completions
    const categoryProgresses = await prisma.categoryProgress.findMany({
      where: { childId, isCompleted: true },
      include: { category: true },
    });
    const completedCategoryTitles = new Set(categoryProgresses.map((cp) => cp.category.title));

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
        await this.unlockBadge(childId, badge.id);
      }
    }
  }
}

export const rewardsService = new RewardService();
export const rewardService = rewardsService; // compatibility alias
