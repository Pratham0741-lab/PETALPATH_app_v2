import { prisma } from '../../config/database.js';
import { starService } from '../stars/star.service.js';

export class SpeakProgressRepository {
  async findProgress(childId: string, activityId: string) {
    return prisma.speakProgress.findUnique({
      where: {
        childId_activityId: {
          childId,
          activityId,
        },
      },
    });
  }

  async upsertProgress(childId: string, activityId: string, data: { isCompleted: boolean; score?: number; attemptCount?: number }) {
    const existing = await this.findProgress(childId, activityId);
    const attemptCount = data.attemptCount ?? (existing ? existing.attemptCount + 1 : 1);
    const inputScore = data.score ?? (existing ? existing.bestScore : 0.0);
    const bestScore = existing ? Math.max(existing.bestScore, inputScore) : inputScore;

    let averageScore = inputScore;
    if (existing) {
      if (data.score !== undefined) {
        averageScore = (existing.averageScore * existing.attemptCount + inputScore) / attemptCount;
      } else {
        averageScore = existing.averageScore;
      }
    }

    const bestStars = starService.calculateSpeakStars(bestScore);

    return prisma.speakProgress.upsert({
      where: {
        childId_activityId: {
          childId,
          activityId,
        },
      },
      update: {
        isCompleted: data.isCompleted,
        attemptCount,
        bestScore,
        averageScore,
        bestStars,
      },
      create: {
        childId,
        activityId,
        isCompleted: data.isCompleted,
        attemptCount,
        bestScore,
        averageScore,
        bestStars,
      },
    });
  }

  async completeSpeak(childId: string, activityId: string, score?: number) {
    const existing = await this.findProgress(childId, activityId);
    const attemptCount = existing ? existing.attemptCount + 1 : 1;
    const inputScore = score ?? 100.0;
    const bestScore = existing ? Math.max(existing.bestScore, inputScore) : inputScore;

    let averageScore = inputScore;
    if (existing) {
      if (score !== undefined) {
        averageScore = (existing.averageScore * existing.attemptCount + inputScore) / attemptCount;
      } else {
        averageScore = existing.averageScore;
      }
    }

    const bestStars = starService.calculateSpeakStars(bestScore);

    return prisma.speakProgress.upsert({
      where: {
        childId_activityId: {
          childId,
          activityId,
        },
      },
      update: {
        isCompleted: true,
        attemptCount,
        bestScore,
        averageScore,
        bestStars,
      },
      create: {
        childId,
        activityId,
        isCompleted: true,
        attemptCount,
        bestScore,
        averageScore,
        bestStars,
      },
    });
  }
}

export const speakProgressRepository = new SpeakProgressRepository();
