import { storiesRepository } from './stories.repository.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { StoryProgress } from '@prisma/client';
import { StoryListQuery, StoryListResult, StoryDetail } from './stories.types.js';
import { starService } from '../stars/star.service.js';
import { rewardsService } from '../rewards/rewards.service.js';

export class StoriesService {
  async listStories(query: StoryListQuery): Promise<StoryListResult> {
    const { data, total } = await storiesRepository.findMany(query);
    const totalPages = Math.ceil(total / query.limit);
    return {
      data,
      pagination: { page: query.page, limit: query.limit, total, totalPages },
    };
  }

  async getStoryById(id: string): Promise<StoryDetail | null> {
    return storiesRepository.findById(id) as Promise<StoryDetail | null>;
  }

  async startStory(childId: string, storyId: string): Promise<StoryProgress> {
    const story = await storiesRepository.findById(storyId);
    if (!story) throw new NotFoundError('Story not found');

    const totalPages = story.pages.length;
    if (totalPages === 0) throw new ValidationError('Story has no pages');

    const existing = await storiesRepository.findProgress(childId, storyId);
    if (existing) {
      if (existing.status === 'COMPLETED') {
        throw new ConflictError('Story already completed');
      }
      return storiesRepository.updateProgress(existing.id, {
        lastReadAt: new Date(),
      });
    }

    return storiesRepository.createProgress({
      child: { connect: { id: childId } },
      story: { connect: { id: storyId } },
      totalPages,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      lastReadAt: new Date(),
    });
  }

  async updatePage(childId: string, storyId: string, pageNumber: number, readingTime?: number): Promise<StoryProgress> {
    const progress = await storiesRepository.findProgress(childId, storyId);
    if (!progress) throw new NotFoundError('Story not started');
    if (progress.status === 'COMPLETED') throw new ConflictError('Story already completed');

    if (progress.totalPages > 0 && pageNumber >= progress.totalPages) {
      throw new ValidationError(`Page number ${pageNumber} exceeds story page count ${progress.totalPages - 1}`);
    }

    const totalPages = progress.totalPages || 1;
    const completionPercent = Math.round(((pageNumber + 1) / totalPages) * 100);

    return storiesRepository.updateProgress(progress.id, {
      currentPage: Math.max(pageNumber, progress.currentPage),
      completionPercent: Math.max(completionPercent, progress.completionPercent),
      ...(readingTime !== undefined ? { readingTime: progress.readingTime + readingTime } : {}),
      lastReadAt: new Date(),
    });
  }

  async completeStory(childId: string, storyId: string, readingTime: number): Promise<StoryProgress> {
    const progress = await storiesRepository.findProgress(childId, storyId);
    if (!progress) throw new NotFoundError('Story not started');
    if (progress.status === 'COMPLETED') throw new ConflictError('Story already completed');

    const story = await storiesRepository.findById(storyId);
    if (!story) throw new NotFoundError('Story not found');

    const updated = await storiesRepository.updateProgress(progress.id, {
      status: 'COMPLETED',
      currentPage: story.pages.length > 0 ? story.pages.length - 1 : 0,
      completionPercent: 100,
      readingTime: progress.readingTime + readingTime,
      starsEarned: 3,
      completedAt: new Date(),
      lastReadAt: new Date(),
    });

    await starService.updateTotalStars(childId);
    await rewardsService.refreshRewards(childId);

    return updated;
  }

  async getProgress(childId: string, storyId: string): Promise<StoryProgress | null> {
    return storiesRepository.findProgress(childId, storyId);
  }
}

export const storiesService = new StoriesService();
