import { offlineQueue, CameraCompletionMetadata } from './offlineQueue';
import { learningApi } from '../../../services/api/learningApi';
import { apiClient } from '../../../services/api/apiClient';
import { cameraAnalytics } from '../analytics/cameraAnalytics';

export class CameraSyncService {
  private isProcessing = false;

  /**
   * Completes an activity locally immediately (instant child gratification)
   * and queues background synchronization.
   */
  public async handleActivityCompletion(
    lessonId: string,
    activityId: string,
    activityType: any,
    durationMs: number,
    attempts = 1,
  ): Promise<CameraCompletionMetadata> {
    const completionId = `comp_${lessonId}_${activityId}_${Date.now()}`;

    // 1. Enqueue to Offline Queue
    const item = await offlineQueue.enqueue({
      completionId,
      lessonId,
      activityId,
      activityType,
      completed: true,
      durationMs,
      attempts,
      timestamp: Date.now(),
    });

    // 2. Log Telemetry
    cameraAnalytics.logEvent('activity_completed', {
      lessonId,
      activityId,
      activityType,
      durationMs,
    });

    // 3. Trigger Background Sync
    this.processQueue().catch(() => {});

    return item;
  }

  /**
   * Background queue processor with exponential backoff.
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const queue = await offlineQueue.getQueue();
      const unsynced = queue.filter((q) => !q.synced);

      for (const item of unsynced) {
        // Exponential backoff check
        const backoffMs = Math.min(1000 * Math.pow(2, item.retryCount), 60000);
        const timeSinceLast = Date.now() - item.timestamp;

        if (item.retryCount > 0 && timeSinceLast < backoffMs) {
          continue; // Wait for exponential backoff window
        }

        try {
          // Re-use existing API client layer
          await apiClient.post('/progress/activity/complete', {
            lessonId: item.lessonId,
            activityType: item.activityType,
            stars: 3,
          });

          // Mark as synced & remove from queue
          await offlineQueue.removeItem(item.completionId);

          cameraAnalytics.logEvent('offline_sync_success', {
            completionId: item.completionId,
            lessonId: item.lessonId,
          });
        } catch (err) {
          item.retryCount += 1;
          await offlineQueue.updateItem(item);

          cameraAnalytics.logEvent('offline_sync_failed', {
            completionId: item.completionId,
            retryCount: item.retryCount,
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const cameraSyncService = new CameraSyncService();
