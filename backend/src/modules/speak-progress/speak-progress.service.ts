import { speakProgressRepository } from './speak-progress.repository.js';
import { activitiesRepository } from '../activities/activities.repository.js';
import { progressService } from '../progress/progress.service.js';
import { starService } from '../stars/star.service.js';
import { NotFoundError } from '../../utils/errors.js';
import { curriculumService } from '../curriculum/curriculum.service.js';
import { isSpeakScored } from '../../shared/utils/lesson-language.js';

/**
 * Unscored practice (a Hindi speaking activity while SPEAK_HINDI_SCORING_ENABLED
 * is off, see shared/utils/lesson-language.ts) records nothing: no progress row,
 * no stars, no mastery evidence. Saves for it, e.g. from app builds that predate
 * practice mode, return the current (normally empty) progress unchanged.
 */
const isUnscored = (lessonId: string): boolean => !isSpeakScored(curriculumService.getLessonById(lessonId));

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
    if (isUnscored(activity.lessonId)) {
      return this.getProgress(childId, activityId);
    }

    const progress = await speakProgressRepository.upsertProgress(childId, activityId, { isCompleted, score });

    if (isCompleted) {
      const finalScore = score !== undefined ? score : progress.bestScore;
      const stars = starService.calculateSpeakStars(finalScore);
      await progressService.updateActivityCompletion(childId, activity.lessonId, 'speak', stars);
    }

    return progress;
  }

  async completeSpeak(childId: string, activityId: string, score?: number) {
    const activity = await activitiesRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity not found');
    }
    if (isUnscored(activity.lessonId)) {
      return this.getProgress(childId, activityId);
    }

    const progress = await speakProgressRepository.completeSpeak(childId, activityId, score);
    const finalScore = score !== undefined ? score : progress.bestScore;
    const stars = starService.calculateSpeakStars(finalScore);
    await progressService.updateActivityCompletion(childId, activity.lessonId, 'speak', stars);

    return progress;
  }
}

export const speakProgressService = new SpeakProgressService();
