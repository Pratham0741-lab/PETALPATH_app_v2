import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityType } from '../types/pose.types';

const QUEUE_STORAGE_KEY = '@petalpath_camera_offline_queue';

export interface CameraCompletionMetadata {
  completionId: string; // Idempotent unique completion UUID
  lessonId: string;
  activityId: string;
  activityType: ActivityType;
  completed: boolean;
  durationMs: number;
  attempts: number;
  timestamp: number;
  retryCount: number;
  synced: boolean;
}

export class OfflineQueueManager {
  public async getQueue(): Promise<CameraCompletionMetadata[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as CameraCompletionMetadata[];
    } catch {
      return [];
    }
  }

  public async enqueue(item: Omit<CameraCompletionMetadata, 'retryCount' | 'synced'>): Promise<CameraCompletionMetadata> {
    const queue = await this.getQueue();
    // Duplicate protection: check if completionId already exists
    const existing = queue.find((q) => q.completionId === item.completionId);
    if (existing) return existing;

    const newItem: CameraCompletionMetadata = {
      ...item,
      retryCount: 0,
      synced: false,
    };

    queue.push(newItem);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    return newItem;
  }

  public async removeItem(completionId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((q) => q.completionId !== completionId);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  }

  public async updateItem(updated: CameraCompletionMetadata): Promise<void> {
    const queue = await this.getQueue();
    const idx = queue.findIndex((q) => q.completionId === updated.completionId);
    if (idx !== -1) {
      queue[idx] = updated;
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    }
  }

  public async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  }
}

export const offlineQueue = new OfflineQueueManager();
