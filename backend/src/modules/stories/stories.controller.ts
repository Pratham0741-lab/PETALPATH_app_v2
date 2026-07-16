import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { storiesService } from './stories.service.js';
import { storyListSchema, pageStorySchema, completeStorySchema } from './stories.validator.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user?.userId) throw new UnauthorizedError('Authentication required');
  return req.user.userId;
}

function requireChildId(req: AuthenticatedRequest): string {
  if (!req.user?.childId) throw new UnauthorizedError('Child profile required');
  return req.user.childId;
}

export class StoriesController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      requireUserId(req);
      const parsed = storyListSchema.safeParse(req.query);
      if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.format());
      const result = await storiesService.listStories(parsed.data);
      return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      requireUserId(req);
      const { id } = req.params;
      const story = await storiesService.getStoryById(id);
      if (!story) throw new NotFoundError('Story not found');
      return res.status(200).json({ success: true, data: story });
    } catch (error) {
      next(error);
    }
  }

  async start(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = requireChildId(req);
      const { id } = req.params;
      const progress = await storiesService.startStory(childId, id);
      logger.info({ childId, storyId: id, totalPages: progress.totalPages }, 'story started');
      return res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }

  async page(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = requireChildId(req);
      const { id } = req.params;
      const parsed = pageStorySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.format());
      const progress = await storiesService.updatePage(childId, id, parsed.data.pageNumber, parsed.data.readingTime);
      return res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = requireChildId(req);
      const { id } = req.params;
      const parsed = completeStorySchema.safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.format());
      const progress = await storiesService.completeStory(childId, id, parsed.data.readingTime);
      logger.info({ childId, storyId: id, starsEarned: progress.starsEarned }, 'story completed');
      return res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }

  async getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const childId = requireChildId(req);
      const { id } = req.params;
      const progress = await storiesService.getProgress(childId, id);
      if (!progress) throw new NotFoundError('Story progress not found');
      return res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }
}

export const storiesController = new StoriesController();
