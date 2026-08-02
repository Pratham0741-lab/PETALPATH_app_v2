import { prisma } from '../../config/database.js';
import { progressRepository } from './progress.repository.js';
import { starService } from '../stars/star.service.js';
import { moduleProgressService } from './module-progress.service.js';
import { categoryProgressService } from './category-progress.service.js';
import { rewardService } from '../rewards/rewards.service.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../utils/errors.js';

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

  async updateActivityCompletion(
    childId: string,
    lessonId: string,
    activityType: string,
    stars: number = 0,
    tx?: any
  ) {
    const executeUpdate = async (client: any) => {
      let progress = await client.lessonProgress.findUnique({
        where: {
          childId_lessonId: { childId, lessonId },
        },
      });

      if (!progress) {
        progress = await client.lessonProgress.create({
          data: {
            childId,
            lessonId,
            status: 'IN_PROGRESS',
          },
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

      const lessonNode = curriculumService.getLessonById(lessonId);
      if (!lessonNode) {
        throw new NotFoundError('Lesson not found in curriculum');
      }

      const currentVideoStars = updateData.videoStars ?? progress.videoStars;
      const currentListenStars = updateData.listenStars ?? progress.listenStars;
      const currentSpeakStars = updateData.speakStars ?? progress.speakStars;
      const currentWriteStars = updateData.writeStars ?? progress.writeStars;

      updateData.totalStars = currentVideoStars + currentListenStars + currentSpeakStars + currentWriteStars;

      const mergedProgress = {
        videoCompleted: updateData.videoCompleted ?? progress.videoCompleted,
        listenCompleted: updateData.listenCompleted ?? progress.listenCompleted,
        speakCompleted: updateData.speakCompleted ?? progress.speakCompleted,
        writeCompleted: updateData.writeCompleted ?? progress.writeCompleted,
      };

      const knowledgeState = await client.knowledgeState.findFirst({
        where: { childId, topicId: lessonId },
      });

      const isEligibleForCompletion = curriculumEngineService.canCompleteLesson(
        lessonNode,
        mergedProgress,
        knowledgeState || undefined
      );

      let becameCompleted = false;
      if (isEligibleForCompletion) {
        if (progress.status !== 'COMPLETED') {
          becameCompleted = true;
        }
        updateData.status = 'COMPLETED';
        updateData.completedAt = progress.completedAt ?? new Date();
      } else {
        updateData.status = 'IN_PROGRESS';
      }

      await client.lessonProgress.update({
        where: { id: progress.id },
        data: updateData as any,
      });

      await starService.updateTotalStars(childId, client);

      if (becameCompleted) {
        // Idempotently apply reward points from curriculum metadata
        if (lessonNode.reward) {
          const rewardTitle = `Lesson Completed: ${lessonNode.id}`;
          const existingReward = await client.reward.findFirst({
            where: { childId, title: rewardTitle },
          });
          if (!existingReward) {
            await client.reward.create({
              data: {
                childId,
                title: rewardTitle,
                description: `Completed "${lessonNode.title}". Earned ${lessonNode.reward.xp} XP and ${lessonNode.reward.coins} coins.`,
                points: lessonNode.reward.xp,
              },
            });
          }
        }

        const lesson = await client.lesson.findUnique({
          where: { id: lessonId },
          include: { module: true },
        });
        if (lesson) {
          const moduleCompleted = await moduleProgressService.completeModule(childId, lesson.moduleId, client);
          if (moduleCompleted) {
            await categoryProgressService.completeCategory(childId, lesson.module.categoryId, client);
          }
        }
        await this.checkAndTriggerGradeProgression(childId, lessonId, client);
      }

      await rewardService.refreshRewards(childId, client);
    };

    if (tx) {
      await executeUpdate(tx);
    } else {
      await prisma.$transaction(async (t) => {
        await executeUpdate(t);
      });
    }
  }

  /**
   * Admin/Testing/Recovery method to complete a lesson.
   * Bypasses standard interactive learner flows.
   */
  async forceCompleteLesson(childId: string, lessonId: string, tx?: any) {
    const executeForce = async (client: any) => {
      const lessonNode = curriculumService.getLessonById(lessonId);
      if (!lessonNode) {
        throw new NotFoundError('Lesson not found in curriculum');
      }

      const progress = await client.lessonProgress.findUnique({
        where: {
          childId_lessonId: { childId, lessonId },
        },
      });

      const videoStars = progress?.videoStars && progress.videoStars > 0
        ? progress.videoStars
        : curriculumEngineService.getActivityDefaultStars('video');
      const listenStars = progress?.listenStars && progress.listenStars > 0
        ? progress.listenStars
        : curriculumEngineService.getActivityDefaultStars('listen');
      const speakStars = progress?.speakStars && progress.speakStars > 0
        ? progress.speakStars
        : curriculumEngineService.getActivityDefaultStars('speak');
      const writeStars = progress?.writeStars && progress.writeStars > 0
        ? progress.writeStars
        : curriculumEngineService.getActivityDefaultStars('write');
      const totalStars = videoStars + listenStars + speakStars + writeStars;

      let becameCompleted = false;
      if (!progress || progress.status !== 'COMPLETED') {
        becameCompleted = true;
      }

      // Upsert a KnowledgeState setting mastery to node.mastery.required_score if defined
      if (lessonNode.mastery) {
        const existingKS = await client.knowledgeState.findFirst({
          where: { childId, topicId: lessonId },
        });
        if (existingKS) {
          await client.knowledgeState.update({
            where: { id: existingKS.id },
            data: { mastery: Math.max(existingKS.mastery, lessonNode.mastery.required_score) },
          });
        } else {
          await client.knowledgeState.create({
            data: {
              childId,
              topicId: lessonId,
              mastery: lessonNode.mastery.required_score,
              confidence: 1.0,
              lastTransitionAt: new Date(),
            },
          });
        }
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
        updatedProgress = await client.lessonProgress.create({
          data: {
            childId,
            lessonId,
            ...updateData,
          },
        });
      } else {
        updatedProgress = await client.lessonProgress.update({
          where: { id: progress.id },
          data: updateData,
        });
      }

      const newTotalStars = await starService.updateTotalStars(childId, client);

      let moduleCompleted = false;
      let categoryCompleted = false;

      if (becameCompleted) {
        // Idempotently apply rewards
        if (lessonNode.reward) {
          const rewardTitle = `Lesson Completed: ${lessonNode.id}`;
          const existingReward = await client.reward.findFirst({
            where: { childId, title: rewardTitle },
          });
          if (!existingReward) {
            await client.reward.create({
              data: {
                childId,
                title: rewardTitle,
                description: `Completed "${lessonNode.title}". Earned ${lessonNode.reward.xp} XP and ${lessonNode.reward.coins} coins.`,
                points: lessonNode.reward.xp,
              },
            });
          }
        }

        const lesson = await client.lesson.findUnique({
          where: { id: lessonId },
          include: { module: true },
        });
        if (lesson) {
          moduleCompleted = await moduleProgressService.completeModule(childId, lesson.moduleId, client);
          if (moduleCompleted) {
            categoryCompleted = await categoryProgressService.completeCategory(childId, lesson.module.categoryId, client);
          }
        }
        await this.checkAndTriggerGradeProgression(childId, lessonId, client);
      }

      await rewardService.refreshRewards(childId, client);

      return {
        progress: updatedProgress,
        becameCompleted,
        moduleCompleted,
        categoryCompleted,
        starsEarned: totalStars,
        totalStars: newTotalStars,
      };
    };

    if (tx) {
      return executeForce(tx);
    } else {
      return prisma.$transaction(async (t) => {
        return executeForce(t);
      });
    }
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

  async checkAndTriggerGradeProgression(childId: string, completedLessonId: string, tx?: any) {
    const client = tx || prisma;
    const child = await client.child.findUnique({ where: { id: childId } });
    if (!child) return;

    const currentGradeId = curriculumService.resolveChildGrade(child);
    try {
      const nodes = curriculumService.getLessonsInCurriculumOrder(currentGradeId);

      const completedProgress = await client.lessonProgress.findMany({
        where: {
          childId,
          lessonId: { in: nodes.map((n) => n.id) },
        },
      });

      const gradeIsFinished = curriculumEngineService.isGradeCompleted(
        nodes,
        completedProgress,
        completedLessonId
      );

      if (gradeIsFinished) {
        const nextLabel = curriculumEngineService.getNextGradeLabel(currentGradeId);
        if (nextLabel) {
          await client.child.update({
            where: { id: childId },
            data: { ageGroup: nextLabel },
          });
        }
      }
    } catch (err) {
      // Ignore errors in progression check
    }
  }
}

export const progressService = new ProgressService();

