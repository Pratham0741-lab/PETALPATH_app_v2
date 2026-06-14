import { prisma } from '../../config/database.js';

export class VideoProgressRepository {
  async findProgress(childId: string, videoId: string) {
    return prisma.videoProgress.findUnique({
      where: {
        childId_videoId: {
          childId,
          videoId,
        },
      },
    });
  }

  async upsertProgress(childId: string, videoId: string, data: { watchPosition: number; isCompleted: boolean }) {
    return prisma.videoProgress.upsert({
      where: {
        childId_videoId: {
          childId,
          videoId,
        },
      },
      update: {
        watchPosition: data.watchPosition,
        isCompleted: data.isCompleted,
        lastWatchedAt: new Date(),
      },
      create: {
        childId,
        videoId,
        watchPosition: data.watchPosition,
        isCompleted: data.isCompleted,
        lastWatchedAt: new Date(),
      },
    });
  }

  async completeVideo(childId: string, videoId: string) {
    return prisma.videoProgress.upsert({
      where: {
        childId_videoId: {
          childId,
          videoId,
        },
      },
      update: {
        isCompleted: true,
        lastWatchedAt: new Date(),
      },
      create: {
        childId,
        videoId,
        isCompleted: true,
        lastWatchedAt: new Date(),
      },
    });
  }
}

export const videoProgressRepository = new VideoProgressRepository();
