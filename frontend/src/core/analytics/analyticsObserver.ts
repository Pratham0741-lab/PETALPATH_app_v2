/**
 * Analytics Observer — PetalPath Core System
 * Listens to ActivityEventBus events and accumulates interaction metrics.
 */

import { ActivityEventBus, ActivityEvent } from '../event-bus/eventBus';

export interface InteractionMetrics {
  attempts: number;
  correctDrops: number;
  incorrectDrops: number;
  accuracy: number;
  completionTimeMs: number;
  averageResponseTimeMs: number;
  hintUsageCount: number;
  dragDistanceTotal: number;
}

export class AnalyticsObserver {
  private metrics: InteractionMetrics = {
    attempts: 0,
    correctDrops: 0,
    incorrectDrops: 0,
    accuracy: 1.0,
    completionTimeMs: 0,
    averageResponseTimeMs: 0,
    hintUsageCount: 0,
    dragDistanceTotal: 0,
  };

  private startTime: number = Date.now();
  private lastActionTime: number = Date.now();
  private responseTimes: number[] = [];
  private unsubscribeFn: (() => void) | null = null;

  attach(eventBus: ActivityEventBus): void {
    this.reset();
    const unsubs = [
      eventBus.on('ACTIVITY_STARTED', () => {
        this.startTime = Date.now();
        this.lastActionTime = Date.now();
      }),

      eventBus.on('VALIDATION_PASSED', () => {
        const now = Date.now();
        this.metrics.attempts += 1;
        this.metrics.correctDrops += 1;
        this.responseTimes.push(now - this.lastActionTime);
        this.lastActionTime = now;
        this.updateAccuracy();
      }),

      eventBus.on('VALIDATION_FAILED', () => {
        const now = Date.now();
        this.metrics.attempts += 1;
        this.metrics.incorrectDrops += 1;
        this.responseTimes.push(now - this.lastActionTime);
        this.lastActionTime = now;
        this.updateAccuracy();
      }),

      eventBus.on('HINT_TRIGGERED', () => {
        this.metrics.hintUsageCount += 1;
      }),

      eventBus.on('DRAG_MOVED', (event: ActivityEvent) => {
        if (event.payload && typeof event.payload.distance === 'number') {
          this.metrics.dragDistanceTotal += event.payload.distance;
        }
      }),

      eventBus.on('ACTIVITY_COMPLETED', () => {
        this.metrics.completionTimeMs = Date.now() - this.startTime;
        this.metrics.averageResponseTimeMs =
          this.responseTimes.length > 0
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
            : 0;
      }),
    ];

    this.unsubscribeFn = () => {
      unsubs.forEach((unsub) => unsub());
    };
  }

  private updateAccuracy(): void {
    if (this.metrics.attempts > 0) {
      this.metrics.accuracy = this.metrics.correctDrops / this.metrics.attempts;
    }
  }

  getMetrics(): InteractionMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      attempts: 0,
      correctDrops: 0,
      incorrectDrops: 0,
      accuracy: 1.0,
      completionTimeMs: 0,
      averageResponseTimeMs: 0,
      hintUsageCount: 0,
      dragDistanceTotal: 0,
    };
    this.startTime = Date.now();
    this.lastActionTime = Date.now();
    this.responseTimes = [];
  }

  detach(): void {
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = null;
    }
  }
}
