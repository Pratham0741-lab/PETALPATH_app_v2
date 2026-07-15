import { assessmentsRepository } from './assessments.repository.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { Prisma, AssessmentQuestion } from '@prisma/client';
import { CreateAssessmentInput, SubmitAttemptInput } from './assessments.types.js';

export class AssessmentsService {
  async listAssessments() {
    return assessmentsRepository.findActive();
  }

  async getAssessment(id: string) {
    const assessment = await assessmentsRepository.findById(id);
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
    const assessment = await assessmentsRepository.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
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

    const questionMap = new Map<string, AssessmentQuestion>(
      attempt.assessment.questions.map((q) => [q.id, q])
    );

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

    return assessmentsRepository.completeAttempt(attemptId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      rawResponses: rawResponses as Prisma.InputJsonValue,
      score: totalScore,
      maxScore,
      percentage,
    });
  }

  private scoreQuestion(question: AssessmentQuestion, answer: string): number {
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
