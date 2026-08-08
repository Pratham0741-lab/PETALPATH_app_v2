/**
 * Event Bus Infrastructure — PetalPath Activity System
 * Strongly typed pub/sub event bus decoupling UI, analytics, hints, and progress systems.
 */

export type ActivityEventType =
  | 'ACTIVITY_STARTED'
  | 'ACTIVITY_PAUSED'
  | 'ACTIVITY_RESUMED'
  | 'ACTIVITY_COMPLETED'
  | 'ITEM_SELECTED'
  | 'ITEM_PLACED'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'HINT_TRIGGERED'
  | 'AUDIO_STARTED'
  | 'AUDIO_FINISHED'
  | 'DRAG_STARTED'
  | 'DRAG_MOVED'
  | 'DRAG_ENDED'
  | 'DISPOSED';

export interface ActivityEvent<T = Record<string, unknown>> {
  type: ActivityEventType;
  timestamp: number;
  payload: T;
}

export type EventCallback<T = any> = (event: ActivityEvent<T>) => void;

export class ActivityEventBus {
  private listeners: Map<ActivityEventType, Set<EventCallback>> = new Map();

  on<T = any>(type: ActivityEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const callbacks = this.listeners.get(type)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
    };
  }

  emit<T = any>(type: ActivityEventType, payload: T): void {
    const event: ActivityEvent<T> = {
      type,
      timestamp: Date.now(),
      payload,
    };
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.error(`Error in event listener for ${type}:`, err);
          }
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const globalEventBus = new ActivityEventBus();
