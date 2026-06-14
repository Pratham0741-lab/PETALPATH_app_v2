import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class RewardsController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      // Fetch stars
      const starsRecord = await prisma.stars.findUnique({
        where: { childId },
      });
      const totalStars = starsRecord?.totalStars ?? 0;

      // Fetch child stickers
      const childStickers = await prisma.childSticker.findMany({
        where: { childId },
        include: { sticker: true },
      });

      // Fetch child badges
      const childBadges = await prisma.childBadge.findMany({
        where: { childId },
        include: { badge: true },
      });

      return res.status(200).json({
        success: true,
        data: {
          totalStars,
          stickers: childStickers.map(cs => ({
            ...cs.sticker,
            unlockedAt: cs.unlockedAt,
          })),
          badges: childBadges.map(cb => ({
            ...cb.badge,
            earnedAt: cb.earnedAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStickers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const stickers = await prisma.sticker.findMany({
        orderBy: { requiredStars: 'asc' },
      });

      const childStickers = await prisma.childSticker.findMany({
        where: { childId },
      });
      const unlockedIds = new Set(childStickers.map(cs => cs.stickerId));

      const data = stickers.map(sticker => ({
        ...sticker,
        unlocked: unlockedIds.has(sticker.id),
      }));

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBadges(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = req.user?.childId;
      if (!childId) {
        throw new UnauthorizedError('Active child profile is not selected');
      }

      const badges = await prisma.badge.findMany();

      const childBadges = await prisma.childBadge.findMany({
        where: { childId },
      });
      const earnedIds = new Set(childBadges.map(cb => cb.badgeId));

      const data = badges.map(badge => ({
        ...badge,
        earned: earnedIds.has(badge.id),
      }));

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const rewardsController = new RewardsController();
