import { prisma } from '../../../config/database.js';
import { MasteryState } from '../../../shared/enums.js';

export interface CreateHistoryInput {
  childId: string;
  skillId: string;
  knowledgeScore: number;
  confidenceScore: number;
  retentionScore: number;
  engagementScore: number;
  consistencyScore: number;
  masteryScore: number;
  masteryState: MasteryState;
}

export class SkillHistoryRepository {
  async create(data: CreateHistoryInput) {
    return prisma.skillHistory.create({
      data,
    });
  }

  async findRecent(childId: string, skillId: string, limit: number) {
    return prisma.skillHistory.findMany({
      where: {
        childId,
        skillId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }
}

export const skillHistoryRepository = new SkillHistoryRepository();
