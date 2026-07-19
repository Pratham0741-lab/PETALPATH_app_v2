import { assessmentsRepository } from './assessments.repository.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { Prisma } from '@prisma/client';
import { CreateAssessmentInput, SubmitAttemptInput } from './assessments.types.js';
import { curriculumService, curriculumEngineService } from '../curriculum/index.js';
import { lessonAccessService } from '../lessons/lesson-access.service.js';
import { progressService } from '../progress/progress.service.js';
import { prisma } from '../../config/database.js';

export class AssessmentsService {
  async listAssessments() {
    return assessmentsRepository.findActive();
  }

  async getAssessment(id: string) {
    const assessment = curriculumService.getAssessment(id) || (await assessmentsRepository.findById(id));
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }
    return assessment;
  }

  async createAssessment(data: CreateAssessmentInput) {
    return assessmentsRepository.create({
      title: data.title,
      description: data.description ?? null,
      ageGroup: data.ageGroup ?? null,
      estimatedMinutes: data.estimatedMinutes ?? 10,
      thumbnail: data.thumbnail ?? null,
      isActive: data.isActive ?? true,
      questions: {
        create: data.questions.map((q) => ({
          prompt: q.prompt,
          questionType: q.questionType,
          ...(q.options ? { options: q.options as Prisma.InputJsonValue } : {}),
          order: q.order ?? 0,
          maxScore: q.maxScore ?? 1,
          correctAnswer: q.correctAnswer ?? null,
        })),
      },
    });
  }

  async startAttempt(childId: string, assessmentId: string) {
    const lessonNode = curriculumService.getLessonById(assessmentId);
    if (lessonNode) {
      // Reject start attempt if the lesson is locked or doesn't belong to the child's grade
      await lessonAccessService.validateLessonAccess(childId, assessmentId);
    } else {
      const assessment = await assessmentsRepository.findById(assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }
    }

    return assessmentsRepository.createAttempt(childId, assessmentId);
  }

  async getAttemptHistory(childId: string, assessmentId?: string) {
    return assessmentsRepository.findAttemptsByChild(childId, assessmentId);
  }

  async getAttempt(childId: string, attemptId: string) {
    const attempt = await assessmentsRepository.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Assessment attempt not found');
    }
    if (attempt.childId !== childId) {
      throw new ForbiddenError('Not authorized for this assessment attempt');
    }
    return attempt;
  }

  async submitAttempt(childId: string, attemptId: string, input: SubmitAttemptInput) {
    return prisma.$transaction(async (tx) => {
      const attempt = await assessmentsRepository.findAttemptById(attemptId);
      if (!attempt) {
        throw new NotFoundError('Assessment attempt not found');
      }
      if (attempt.childId !== childId) {
        throw new ForbiddenError('Not authorized for this assessment attempt');
      }
      if (attempt.status === 'COMPLETED') {
        throw new ForbiddenError('Assessment attempt already completed');
      }

      // If lesson assessment, validate lesson is still unlocked and belongs to grade
      const lessonNode = curriculumService.getLessonById(attempt.assessmentId);
      if (lessonNode) {
        await lessonAccessService.validateLessonAccess(childId, attempt.assessmentId);
      }

      const questions = attempt.assessment?.questions ?? [];
      const questionMap = new Map<string, any>(questions.map((q: any) => [q.id, q]));

      let totalScore = 0;
      let maxScore = 0;

      const rawResponses = input.responses.map((r) => {
        const question = questionMap.get(r.questionId);
        if (question) {
          maxScore += question.maxScore;
          totalScore += this.scoreQuestion(question, r.answer);
        }
        return { questionId: r.questionId, answer: r.answer };
      });

      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      const updatedAttempt = await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          rawResponses: rawResponses as Prisma.InputJsonValue,
          score: totalScore,
          maxScore,
          percentage,
        },
      });

      // Update Mastery/KnowledgeState if linked to a curriculum lesson
      if (lessonNode) {
        const requiredScore = lessonNode.mastery?.required_score ?? 80;
        const state = percentage >= requiredScore ? 'MASTERED' : 'LEARNING';

        const existingKS = await tx.knowledgeState.findFirst({
          where: { childId, topicId: lessonNode.id },
        });

        if (existingKS) {
          await tx.knowledgeState.update({
            where: { id: existingKS.id },
            data: {
              mastery: percentage,
              state,
              lastTransitionAt: new Date(),
            },
          });
        } else {
          await tx.knowledgeState.create({
            data: {
              childId,
              topicId: lessonNode.id,
              mastery: percentage,
              state,
              confidence: 1.0,
              lastTransitionAt: new Date(),
            },
          });
        }

        // Check if there is an 'assessment' type activity defined in the lesson
        const hasAssessmentActivity = lessonNode.activities.some((act) => act.type === 'assessment');
        if (hasAssessmentActivity) {
          // Complete the assessment activity in progressService (using stars mapped from percentage)
          const stars = percentage >= 80 ? 3 : percentage >= 50 ? 2 : percentage >= 1 ? 1 : 0;
          await progressService.updateActivityCompletion(childId, lessonNode.id, 'assessment', stars, tx);
        } else {
          // If no assessment activity is explicitly defined in the activities array,
          // check if we should complete the lesson now that the mastery requirement is satisfied
          let progress = await tx.lessonProgress.findUnique({
            where: {
              childId_lessonId: { childId, lessonId: lessonNode.id },
            },
          });

          if (!progress) {
            progress = await tx.lessonProgress.create({
              data: {
                childId,
                lessonId: lessonNode.id,
                status: 'IN_PROGRESS',
              },
            });
          }

          const mergedProgress = {
            videoCompleted: progress.videoCompleted,
            listenCompleted: progress.listenCompleted,
            speakCompleted: progress.speakCompleted,
            writeCompleted: progress.writeCompleted,
          };

          const updatedKS = await tx.knowledgeState.findFirst({
            where: { childId, topicId: lessonNode.id },
          });

          const isEligibleForCompletion = curriculumEngineService.canCompleteLesson(
            lessonNode,
            mergedProgress,
            updatedKS || undefined
          );

          if (isEligibleForCompletion && progress.status !== 'COMPLETED') {
            await progressService.forceCompleteLesson(childId, lessonNode.id, tx);
          }
        }
      }

      return {
        ...updatedAttempt,
        assessment: attempt.assessment ? { id: attempt.assessment.id, title: attempt.assessment.title } : null,
      };
    });
  }

  private scoreQuestion(question: any, answer: string): number {
    const value = answer.trim();
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
      case 'BOOLEAN':
        return question.correctAnswer !== null && question.correctAnswer === value
          ? question.maxScore
          : 0;
      case 'SCALE': {
        const num = Number(value);
        if (Number.isNaN(num)) return 0;
        return Math.max(0, Math.min(num, question.maxScore));
      }
      case 'TEXT':
      default:
        return 0;
    }
  }
}

export const assessmentsService = new AssessmentsService();
