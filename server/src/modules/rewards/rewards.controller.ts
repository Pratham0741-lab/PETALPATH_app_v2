import { Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { storageService } from '../../shared/services/storage.service.js';

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
            imagePath: storageService.getPublicUrl(cs.sticker.iconKey),
            unlockedAt: cs.unlockedAt,
          })),
          badges: childBadges.map(cb => ({
            ...cb.badge,
            imagePath: storageService.getPublicUrl(cb.badge.iconKey),
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
        imagePath: storageService.getPublicUrl(sticker.iconKey),
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
        imagePath: storageService.getPublicUrl(badge.iconKey),
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
