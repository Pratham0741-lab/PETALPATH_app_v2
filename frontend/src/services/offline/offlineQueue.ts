import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineRequestMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OfflineRequestCategory =
  | 'lesson-progress'
  | 'activity-completion'
  | 'assessment-submission'
  | 'reading-completion'
  | 'story-completion'
  | 'video-progress'
  | 'audio-progress'
  | 'speak-progress'
  | 'write-progress'
  | 'generic';

export interface QueuedRequest {
  id: string;
  method: OfflineRequestMethod;
  url: string;
  body?: unknown;
  category: OfflineRequestCategory;
  createdAt: number;
  attempts: number;
  lastError?: string;
  maxAttempts: number;
}

const STORAGE_KEY = 'petalpath.offline.queue.v1';
const MAX_QUEUE_SIZE = 200;

let memoryCache: QueuedRequest[] | null = null;

function generateId(): string {
  return `off_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function loadFromStorage(): Promise<QueuedRequest[]> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
    memoryCache = Array.isArray(parsed) ? parsed : [];
  } catch {
    memoryCache = [];
  }
  return memoryCache;
}

async function persist(queue: QueuedRequest[]): Promise<void> {
  memoryCache = queue;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* persistence is best-effort; in-memory cache still valid */
  }
}

export const offlineQueue = {
  async enqueue(input: {
    method: OfflineRequestMethod;
    url: string;
    body?: unknown;
    category: OfflineRequestCategory;
    maxAttempts?: number;
  }): Promise<QueuedRequest> {
    const queue = await loadFromStorage();
    const item: QueuedRequest = {
      id: generateId(),
      method: input.method,
      url: input.url,
      body: input.body,
      category: input.category,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 5,
    };
    const next = [...queue, item];
    await persist(next.length > MAX_QUEUE_SIZE ? next.slice(-MAX_QUEUE_SIZE) : next);
    return item;
  },

  async getAll(): Promise<QueuedRequest[]> {
    return [...(await loadFromStorage())];
  },

  async getPending(): Promise<QueuedRequest[]> {
    const queue = await loadFromStorage();
    return queue.filter((q) => q.attempts < q.maxAttempts);
  },

  async getByCategory(category: OfflineRequestCategory): Promise<QueuedRequest[]> {
    const queue = await loadFromStorage();
    return queue.filter((q) => q.category === category);
  },

  async markAttempt(id: string, lastError?: string): Promise<void> {
    const queue = await loadFromStorage();
    const next = queue.map((q) =>
      q.id === id ? { ...q, attempts: q.attempts + 1, lastError } : q,
    );
    await persist(next);
  },

  async remove(id: string): Promise<void> {
    const queue = await loadFromStorage();
    await persist(queue.filter((q) => q.id !== id));
  },

  async clearFailed(): Promise<void> {
    const queue = await loadFromStorage();
    await persist(queue.filter((q) => q.attempts < q.maxAttempts));
  },

  async clear(): Promise<void> {
    await persist([]);
  },

  size(): Promise<number> {
    return loadFromStorage().then((q) => q.length);
  },
};
