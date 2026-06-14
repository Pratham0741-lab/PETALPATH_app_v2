import { listenProgressRepository } from './listen-progress.repository.js';
import { activitiesRepository } from '../activities/activities.repository.js';
import { progressRepository } from '../progress/progress.repository.js';
import { NotFoundError } from '../../utils/errors.js';

export class ListenProgressService {
  async getProgress(childId: string, activityId: string) {
    const progress = await listenProgressRepository.findProgress(childId, activityId);
    if (!progress) {
      return {
        childId,
        activityId,
        isCompleted: false,
        attemptCount: 0,
      };
    }
    return progress;
  }

  async saveProgress(childId: string, activityId: string, isCompleted: boolean) {
    const activity = await activitiesRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity not found');
    }

    const progress = await listenProgressRepository.upsertProgress(childId, activityId, { isCompleted });

    if (isCompleted) {
      await progressRepository.updateActivityCompletion(childId, activity.lessonId, 'listen', 1);
    }

    return progress;
  }

  async completeListen(childId: string, activityId: string) {
    const activity = await activitiesRepository.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Activity not found');
    }

    const progress = await listenProgressRepository.completeListen(childId, activityId);
    await progressRepository.updateActivityCompletion(childId, activity.lessonId, 'listen', 1);

    return progress;
  }
}

export const listenProgressService = new ListenProgressService();
