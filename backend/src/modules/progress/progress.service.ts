import { prisma } from '../../config/database.js';
import { progressRepository } from './progress.repository.js';
import { starService } from '../stars/star.service.js';
import { moduleProgressService } from './module-progress.service.js';
import { categoryProgressService } from './category-progress.service.js';
import { rewardService } from '../rewards/rewards.service.js';
import { Prisma } from '@prisma/client';

export class ProgressService {
  async getAllProgress() {
    return progressRepository.findAll();
  }

  async getProgressById(id: string) {
    return progressRepository.findById(id);
  }

  async getByChildAndLesson(childId: string, lessonId: string) {
    return progressRepository.findByChildAndLesson(childId, lessonId);
  }

  async getByChildId(childId: string) {
    return progressRepository.findByChildId(childId);
  }

  async createProgress(data: Prisma.LessonProgressUncheckedCreateInput | Prisma.LessonProgressCreateInput) {
    return progressRepository.create(data);
  }

  async updateProgress(id: string, data: Prisma.LessonProgressUpdateInput) {
    return progressRepository.update(id, data);
  }

  async updateActivityCompletion(childId: string, lessonId: string, activityType: string, stars: number = 0) {
    let progress = await progressRepository.findByChildAndLesson(childId, lessonId);

    if (!progress) {
      progress = await progressRepository.create({
        childId,
        lessonId,
        status: 'IN_PROGRESS' as any,
      });
    }

    interface ProgressUpdatePayload {
      status?: 'IN_PROGRESS' | 'COMPLETED';
      completedAt?: Date | null;
      videoCompleted?: boolean;
      videoStars?: number;
      listenCompleted?: boolean;
      listenStars?: number;
      speakCompleted?: boolean;
      speakStars?: number;
      writeCompleted?: boolean;
      writeStars?: number;
      totalStars?: number;
    }

    const updateData: ProgressUpdatePayload = {};
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

    const lessonActivities = await prisma.activity.findMany({
      where: { lessonId, deletedAt: null },
    });

    const hasVideo = lessonActivities.some((a) => a.activityType === 'video');
    const hasListen = lessonActivities.some((a) => a.activityType === 'listen');
    const hasSpeak = lessonActivities.some((a) => a.activityType === 'speak');
    const hasWrite = lessonActivities.some((a) => a.activityType === 'write');

    const isVideoDone = hasVideo ? (updateData.videoCompleted ?? progress.videoCompleted) : true;
    const isListenDone = hasListen ? (updateData.listenCompleted ?? progress.listenCompleted) : true;
    const isSpeakDone = hasSpeak ? (updateData.speakCompleted ?? progress.speakCompleted) : true;
    const isWriteDone = hasWrite ? (updateData.writeCompleted ?? progress.writeCompleted) : true;

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

    await prisma.lessonProgress.update({
      where: { id: progress.id },
      data: updateData as any,
    });

    await starService.updateTotalStars(childId);

    if (becameCompleted) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: true },
      });
      if (lesson) {
        const moduleCompleted = await moduleProgressService.completeModule(childId, lesson.moduleId);
        if (moduleCompleted) {
          await categoryProgressService.completeCategory(childId, lesson.module.categoryId);
        }
      }
    }

    await rewardService.refreshRewards(childId);
  }

  async forceCompleteLesson(childId: string, lessonId: string) {
    let progress = await progressRepository.findByChildAndLesson(childId, lessonId);

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
      updatedProgress = await progressRepository.create({
        childId,
        lessonId,
        ...updateData,
      });
    } else {
      await progressRepository.update(progress.id, updateData);
      updatedProgress = await progressRepository.findById(progress.id);
    }

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
      prisma.stars.updateMany({ where: { childId }, data: { totalStars: 0 } }),
      prisma.childSticker.deleteMany({ where: { childId } }),
      prisma.childBadge.deleteMany({ where: { childId } }),
      prisma.moduleProgress.deleteMany({ where: { childId } }),
      prisma.categoryProgress.deleteMany({ where: { childId } }),
      prisma.skillHealth.deleteMany({ where: { childId } }),
      prisma.skillHistory.deleteMany({ where: { childId } }),
      prisma.regressionLog.deleteMany({ where: { childId } }),
      prisma.reinforcementQueue.deleteMany({ where: { childId } }),
      prisma.reinforcementHistory.deleteMany({ where: { childId } }),
      prisma.reinforcementEvent.deleteMany({ where: { childId } }),
      prisma.childSkillCurriculum.deleteMany({ where: { childId } }),
      prisma.learningProfile.deleteMany({ where: { childId } }),
      prisma.modalityPerformance.deleteMany({ where: { childId } }),
      prisma.adaptationEvent.deleteMany({ where: { childId } }),
      prisma.learningEvent.deleteMany({ where: { childId } }),
      prisma.sessionPlan.deleteMany({ where: { childId } }),
      prisma.analyticsSnapshot.deleteMany({ where: { childId } }),
      prisma.analyticsHistory.deleteMany({ where: { childId } }),
      prisma.trendEvent.deleteMany({ where: { childId } }),
      prisma.subjectAnalytics.deleteMany({ where: { childId } }),
      prisma.questionnaire.deleteMany({ where: { childId } }),
    ]);
  }

  async deleteProgress(id: string) {
    return progressRepository.delete(id);
  }
}

export const progressService = new ProgressService();
