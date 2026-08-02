import { videoProgressRepository } from './video-progress.repository.js';
import { videosRepository } from '../videos/videos.repository.js';
import { activitiesRepository } from '../activities/activities.repository.js';
import { progressService } from '../progress/progress.service.js';
import { NotFoundError } from '../../utils/errors.js';

export class VideoProgressService {
  async getProgress(childId: string, videoId: string) {
    if (videoId.startsWith('placeholder') || videoId === 'coming_soon') {
      return {
        childId,
        videoId,
        watchPosition: 0,
        isCompleted: false,
      };
    }
    const progress = await videoProgressRepository.findProgress(childId, videoId);
    if (!progress) {
      return {
        childId,
        videoId,
        watchPosition: 0,
        isCompleted: false,
      };
    }
    return progress;
  }

  async saveProgress(childId: string, videoId: string, watchPosition: number, activityId?: string) {
    const video = await videosRepository.findById(videoId);
    if (!video) {
      if (videoId.startsWith('placeholder') || videoId === 'coming_soon') {
        if (activityId) {
          const activity = await activitiesRepository.findById(activityId);
          if (activity) {
            await progressService.updateActivityCompletion(childId, activity.lessonId, 'video', 1);
          }
        }
        return {
          childId,
          videoId,
          watchPosition,
          isCompleted: true,
        };
      }
      throw new NotFoundError('Video not found');
    }

    // Completion detection: 95% threshold of video duration
    const duration = video.duration;
    const isCompleted = duration > 0 ? (watchPosition >= 0.95 * duration) : false;

    const progress = await videoProgressRepository.upsertProgress(childId, videoId, {
      watchPosition,
      isCompleted,
    });

    if (isCompleted) {
      const activity = await activitiesRepository.findById(video.activityId);
      if (activity) {
        await progressService.updateActivityCompletion(childId, activity.lessonId, 'video', 1);
      }
    }

    return progress;
  }

  async completeVideo(childId: string, videoId: string, activityId?: string) {
    const video = await videosRepository.findById(videoId);
    if (!video) {
      if (videoId.startsWith('placeholder') || videoId === 'coming_soon') {
        if (activityId) {
          const activity = await activitiesRepository.findById(activityId);
          if (activity) {
            await progressService.updateActivityCompletion(childId, activity.lessonId, 'video', 1);
          }
        }
        return {
          childId,
          videoId,
          watchPosition: 10,
          isCompleted: true,
        };
      }
      throw new NotFoundError('Video not found');
    }

    const progress = await videoProgressRepository.completeVideo(childId, videoId);

    const activity = await activitiesRepository.findById(video.activityId);
    if (activity) {
      await progressService.updateActivityCompletion(childId, activity.lessonId, 'video', 1);
    }

    return progress;
  }
}

export const videoProgressService = new VideoProgressService();

