import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { StoryListQuery } from './stories.types.js';

export class StoriesRepository {
  async findMany(query: StoryListQuery) {
    const where: Prisma.StoryWhereInput = { deletedAt: null, isActive: true };

    if (query.category) where.category = query.category;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.readingLevel) where.readingLevel = query.readingLevel;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.story.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.story.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.story.findFirst({
      where: { id, deletedAt: null, isActive: true },
      include: {
        pages: { orderBy: { pageNumber: 'asc' } },
        vocabulary: true,
      },
    });
  }

  async findProgress(childId: string, storyId: string) {
    return prisma.storyProgress.findUnique({
      where: { childId_storyId: { childId, storyId } },
    });
  }

  async createProgress(data: Prisma.StoryProgressCreateInput) {
    return prisma.storyProgress.create({ data });
  }

  async updateProgress(id: string, data: Prisma.StoryProgressUpdateInput) {
    return prisma.storyProgress.update({ where: { id }, data });
  }
}

export const storiesRepository = new StoriesRepository();
