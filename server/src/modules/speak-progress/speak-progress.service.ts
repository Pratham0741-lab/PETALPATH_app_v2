import { speakProgressRepository } from './speak-progress.repository.js';
import { activitiesRepository } from '../activities/activities.repository.js';
import { progressRepository } from '../progress/progress.repository.js';
import { starService } from '../stars/star.service.js';
import { NotFoundError } from '../../utils/errors.js';

export class SpeakProgressService {
  async getProgress(childId: string, activityId: string) {
    const progress = await speakProgressRepository.findProgress(childId, activityId);
    if (!progress) {
      return {
        childId,
        activityId,
        isCompleted: false,
        attemptCount: 0,
        bestScore: 0.0,
      };
    }
    return progress;
  }

  async saveProgress(childId: string, activityId: string, isCompleted: boolean, score?: number) {
    const activity = await activitiesRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity not found');
    }

    const progress = await speakProgressRepository.upsertProgress(childId, activityId, { isCompleted, score });

    if (isCompleted) {
      const finalScore = score !== undefined ? score : progress.bestScore;
      const stars = starService.calculateSpeakStars(finalScore);
      await progressRepository.updateActivityCompletion(childId, activity.lessonId, 'speak', stars);
    }

    return progress;
  }

  async completeSpeak(childId: string, activityId: string, score?: number) {
    const activity = await activitiesRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity not found');
    }

    const progress = await speakProgressRepository.completeSpeak(childId, activityId, score);
    const finalScore = score !== undefined ? score : progress.bestScore;
    const stars = starService.calculateSpeakStars(finalScore);
    await progressRepository.updateActivityCompletion(childId, activity.lessonId, 'speak', stars);

    return progress;
  }
}

export const speakProgressService = new SpeakProgressService();
