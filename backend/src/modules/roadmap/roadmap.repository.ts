import { prisma } from '../../config/database.js';

export class RoadmapRepository {
  async getCurriculumTree() {
    return prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { displayOrder: 'asc' },
              include: {
                activities: {
                  where: { deletedAt: null },
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    video: true,
                    audio: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getChildProgress(childId: string) {
    return prisma.lessonProgress.findMany({
      where: { childId, deletedAt: null },
    });
  }
}

export const roadmapRepository = new RoadmapRepository();
