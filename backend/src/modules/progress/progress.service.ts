import { prisma } from '../../config/database.js';
import { progressRepository } from './progress.repository.js';
import { starService } from '../stars/star.service.js';
import { moduleProgressService } from './module-progress.service.js';
import { categoryProgressService } from './category-progress.service.js';
import { rewardService } from '../rewards/rewards.service.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { masteryEngineService } from '../mastery-engine/mastery-engine.service.js';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { normalizeActivityType } from '../../shared/utils/activity-type-normalizer.js';
import {
  computeLessonEvidence,
  expectedModalitiesOf,
  gatherModalitySignals,
} from './lesson-evidence.js';
import { projectMasteryToKnowledgeState } from './knowledge-state.writer.js';

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
      // Normalize granular types (trace→write, tap→listen, etc.)
      const normalizedType = normalizeActivityType(activityType);
      if (normalizedType === 'video') {
        updateData.videoCompleted = true;
        updateData.videoStars = stars;
      } else if (normalizedType === 'listen') {
        updateData.listenCompleted = true;
        updateData.listenStars = stars;
      } else if (normalizedType === 'speak') {
        updateData.speakCompleted = true;
        updateData.speakStars = stars;
      } else if (normalizedType === 'write') {
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

      /*
       * Completion is coverage only. It used to also require
       * `KnowledgeState.mastery >= node.mastery.required_score`, which no child
       * could satisfy: the mastery is scored *from* this completion, so the
       * lesson could never finish and therefore never be scored. A thin pass now
       * completes and scores low, which is what puts it in the review queue.
       */
      const isEligibleForCompletion = curriculumEngineService.canCompleteLesson(
        lessonNode,
        mergedProgress
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

      /*
       * Score the skill once the lesson's whole activity set has been satisfied.
       *
       * This used to fire on *every* activity completion, with six of its eight
       * inputs hardcoded (`responseTime: 15`, `attempts: 1`, `helpRequests: 0`,
       * `sessionDuration: 120`, `retries: 3 - stars`, and `engagementScore` set
       * to the accuracy it was already passing). Two problems: three of the five
       * scoring dimensions could never move, and writing a `SkillHistory` row per
       * activity meant the five-row consistency window filled up with rows from a
       * single lesson — so "consistency" measured variation *within* one sitting
       * rather than across days, which is the only thing it can usefully mean.
       *
       * Now there is one scoring event per completed pass through a lesson, from
       * whichever path finishes it, and its inputs are measured rather than
       * assumed. A repeat pass (a review) scores again, which is exactly what the
       * consistency window wants to see.
       */
      if (isEligibleForCompletion) {
        try {
          const refreshedProgress = await client.lessonProgress.findUnique({ where: { id: progress.id } });
          const expectedModalities = expectedModalitiesOf(lessonNode.activities);
          const signals = await gatherModalitySignals(
            childId,
            lessonId,
            expectedModalities,
            refreshedProgress,
            client
          );
          const previousHealth = await client.skillHealth.findUnique({
            where: { childId_skillId: { childId, skillId: lessonId } },
          });
          const evidence = computeLessonEvidence({
            expectedModalities,
            signals,
            priorAttemptTotal: previousHealth?.attemptCount ?? 0,
            priorSessions: previousHealth?.reviewCount ?? 0,
            requiredAttempts: lessonNode.mastery?.attempts ?? null,
            // Must be passed here too, or this path and `lesson-completion`
            // disagree about how many sessions prove mastery for the same lesson.
            difficulty: lessonNode.difficulty ?? null,
            estimatedMinutes: lessonNode.estimated_minutes,
          });

          // The engine keys on `Skill`; `prisma/seed.ts` mirrors each curriculum
          // lesson to a same-id Skill, so this normally exists.
          const skillExists = await client.skill.findUnique({ where: { id: lessonId }, select: { id: true } });
          const masteryResult = skillExists
            ? await masteryEngineService.evaluateMastery(
                {
                  childId,
                  skillId: lessonId,
                  accuracy: evidence.accuracy,
                  responseTime: evidence.responseTime,
                  attempts: evidence.attempts,
                  retries: evidence.retries,
                  engagementScore: evidence.engagementScore,
                  helpRequests: evidence.helpRequests,
                  sessionDuration: evidence.sessionDuration,
                  masteryProven: evidence.masteryProven,
                },
                client
              )
            : null;

          /*
           * Project onto `KnowledgeState` — the store the unlock gate reads.
           *
           * Without this, a lesson finished entirely through the activity path
           * (which is what the camera and every in-lesson activity use) left the
           * gate's store untouched, so the engine's verdict never reached the
           * thing deciding what opens next. Same writer as
           * `lessonCompletionService`, so the two paths cannot diverge.
           */
          await projectMasteryToKnowledgeState(
            {
              childId,
              topicId: lessonId,
              evidence,
              signals,
              masteryScore: masteryResult?.masteryScore ?? null,
              masteryState: masteryResult?.currentState ?? null,
              confidenceScore: masteryResult?.confidenceScore ?? null,
              now: new Date(),
            },
            client
          );
        } catch (err) {
          // Previously an empty catch, which made a broken engine look exactly
          // like a working one. Still non-blocking — a scoring failure must not
          // cost the child their finished lesson — but no longer silent.
          logger.error(
            { childId, lessonId, activityType, err },
            'Adaptive mastery evaluation failed during activity completion'
          );
        }
      }

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
   *
   * **Not the learner path.** `POST /progress/complete` now routes to
   * `lessonCompletionService`, which measures what the child actually did and
   * runs the adaptive engine. This method remains for genuine recovery — a lesson
   * wedged by bad data, or a passed assessment that should open the lesson it
   * belongs to — and it necessarily fabricates: it forces all four activity flags
   * true, substitutes default stars for activities the child never opened, and
   * asserts the curriculum's `required_score` as mastery.
   *
   * Every fabricated row is therefore stamped with a `transitionReason` of
   * `force-complete`, so that data arriving from this method can be told apart
   * from data a child earned.
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
            data: {
              mastery: Math.max(existingKS.mastery, lessonNode.mastery.required_score),
              lastTransitionAt: new Date(),
              transitionReason: 'force-complete',
            },
          });
        } else {
          await client.knowledgeState.create({
            data: {
              childId,
              topicId: lessonId,
              mastery: lessonNode.mastery.required_score,
              confidence: 1.0,
              lastTransitionAt: new Date(),
              transitionReason: 'force-complete',
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

