import { prisma } from '../../config/database.js';
import { starService } from '../stars/star.service.js';
import { moduleProgressService } from './module-progress.service.js';
import { categoryProgressService } from './category-progress.service.js';
import { rewardService } from '../rewards/rewards.service.js';

export class ProgressRepository {
  async findAll() {
    return prisma.lessonProgress.findMany({
      where: { deletedAt: null },
    });
  }

  async findById(id: string) {
    return prisma.lessonProgress.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByChildAndLesson(childId: string, lessonId: string) {
    return prisma.lessonProgress.findUnique({
      where: {
        childId_lessonId: { childId, lessonId },
      },
    });
  }

  async findByChildId(childId: string) {
    return prisma.lessonProgress.findMany({
      where: { childId, deletedAt: null },
    });
  }

  async create(data: any) {
    return prisma.lessonProgress.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return prisma.lessonProgress.update({
      where: { id },
      data,
    });
  }

  async updateActivityCompletion(childId: string, lessonId: string, activityType: string, stars: number = 0) {
    // Find or create LessonProgress for this child and lesson
    let progress = await prisma.lessonProgress.findUnique({
      where: { childId_lessonId: { childId, lessonId } },
    });

    if (!progress) {
      progress = await prisma.lessonProgress.create({
        data: {
          childId,
          lessonId,
          status: 'IN_PROGRESS',
        },
      });
    }

    const updateData: any = {};
    if (activityType === 'video') {
      updateData.videoCompleted = true;
      updateData.videoStars = stars;
    } else if (activityType === 'listen') {
      updateData.listenCompleted = true;
      updateData.listenStars = stars;
    } else if (activityType === 'speak') {
      updateData.speakCompleted = true;
      updateData.speakStars = stars;
    } else if (activityType === 'write') {
      updateData.writeCompleted = true;
      updateData.writeStars = stars;
    }

    // Check if all are completed
    const isVideoDone = updateData.videoCompleted ?? progress.videoCompleted;
    const isListenDone = updateData.listenCompleted ?? progress.listenCompleted;
    const isSpeakDone = updateData.speakCompleted ?? progress.speakCompleted;
    const isWriteDone = updateData.writeCompleted ?? progress.writeCompleted;

    const currentVideoStars = updateData.videoStars ?? progress.videoStars;
    const currentListenStars = updateData.listenStars ?? progress.listenStars;
    const currentSpeakStars = updateData.speakStars ?? progress.speakStars;
    const currentWriteStars = updateData.writeStars ?? progress.writeStars;

    updateData.totalStars = currentVideoStars + currentListenStars + currentSpeakStars + currentWriteStars;

    let becameCompleted = false;
    if (isVideoDone && isListenDone && isSpeakDone && isWriteDone) {
      if (progress.status !== 'COMPLETED') {
        becameCompleted = true;
      }
      updateData.status = 'COMPLETED';
      updateData.completedAt = progress.completedAt ?? new Date();
    } else {
      updateData.status = 'IN_PROGRESS';
    }

    const updatedProgress = await prisma.lessonProgress.update({
      where: { id: progress.id },
      data: updateData,
    });

    // Update the child's cumulative Stars record
    await starService.updateTotalStars(childId);

    if (becameCompleted) {
      // Find lesson to get its moduleId
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: true },
      });
      if (lesson) {
        // Complete module
        const moduleCompleted = await moduleProgressService.completeModule(childId, lesson.moduleId);
        if (moduleCompleted) {
          // Complete category
          await categoryProgressService.completeCategory(childId, lesson.module.categoryId);
        }
      }
    }

    // Refresh all rewards (grant qualifiers)
    await rewardService.refreshRewards(childId);

    return updatedProgress;
  }

  async forceCompleteLesson(childId: string, lessonId: string) {
    let progress = await prisma.lessonProgress.findUnique({
      where: { childId_lessonId: { childId, lessonId } },
    });

    const speakStars = progress && progress.speakStars > 0 ? progress.speakStars : 3;
    const writeStars = progress && progress.writeStars > 0 ? progress.writeStars : 3;
    const videoStars = 1;
    const listenStars = 1;
    const totalStars = videoStars + listenStars + speakStars + writeStars;

    let becameCompleted = false;
    if (!progress || progress.status !== 'COMPLETED') {
      becameCompleted = true;
    }

    const updateData = {
      status: 'COMPLETED',
      videoCompleted: true,
      listenCompleted: true,
      speakCompleted: true,
      writeCompleted: true,
      videoStars,
      listenStars,
      speakStars,
      writeStars,
      totalStars,
      completedAt: progress?.completedAt ?? new Date(),
    };

    let updatedProgress;
    if (!progress) {
      updatedProgress = await prisma.lessonProgress.create({
        data: {
          childId,
          lessonId,
          ...updateData,
        },
      });
    } else {
      updatedProgress = await prisma.lessonProgress.update({
        where: { id: progress.id },
        data: updateData,
      });
    }

    // Update child total stars
    const newTotalStars = await starService.updateTotalStars(childId);

    let moduleCompleted = false;
    let categoryCompleted = false;

    if (becameCompleted) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: true },
      });
      if (lesson) {
        moduleCompleted = await moduleProgressService.completeModule(childId, lesson.moduleId);
        if (moduleCompleted) {
          categoryCompleted = await categoryProgressService.completeCategory(childId, lesson.module.categoryId);
        }
      }
    }

    await rewardService.refreshRewards(childId);

    return {
      progress: updatedProgress,
      becameCompleted,
      moduleCompleted,
      categoryCompleted,
      starsEarned: totalStars,
      totalStars: newTotalStars,
    };
  }

  async resetAllProgress(childId: string) {
    return prisma.$transaction([
      prisma.lessonProgress.deleteMany({ where: { childId } }),
      prisma.videoProgress.deleteMany({ where: { childId } }),
      prisma.listenProgress.deleteMany({ where: { childId } }),
      prisma.speakProgress.deleteMany({ where: { childId } }),
      prisma.writeProgress.deleteMany({ where: { childId } }),
      prisma.reward.deleteMany({ where: { childId } }),
    ]);
  }

  async delete(id: string) {
    return prisma.lessonProgress.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const progressRepository = new ProgressRepository();

