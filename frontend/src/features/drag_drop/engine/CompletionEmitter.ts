/**
 * Completion Emitter — PetalPath Drag & Drop Subsystem
 * Evaluates completion signal conditions and emits signals upon activity finish.
 */

import { CompletionSignalsConfig } from '../types';
import { api } from '../../../api/client';
import { useRoadmapStore } from '../../../store/roadmapStore';

export interface SignalEvaluationInput {
  activityId: string;
  score: number; // 0..100
  percentageScore: number; // 0..1.0
  stars: number;
  attempts: number;
  totalDraggables: number;
}

export class CompletionEmitter {
  constructor(private config?: CompletionSignalsConfig) {}

  evaluateAndEmit(input: SignalEvaluationInput): string[] {
    const emittedSignals: string[] = [];

    if (!this.config?.signals || this.config.signals.length === 0) {
      emittedSignals.push('activity.completed');
    } else {
      for (const signal of this.config.signals) {
        if (this.evaluateCondition(signal.condition, input)) {
          emittedSignals.push(signal.signalId);
        }
      }
    }

    // Persist the game's stars like any other activity's, so they count toward
    // the lesson's total (3 per activity). This used to post to
    // `/activities/:id/game/complete`, an endpoint the server never had, so
    // the result was silently lost.
    const lessonId = useRoadmapStore.getState().selectedLesson?.id;
    if (!lessonId) return emittedSignals;
    api.post('/progress/activity/complete', {
      lessonId,
      activityType: 'drag_drop',
      stars: Math.max(0, Math.min(3, Math.round(input.stars))),
    }).catch((err) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('Failed to submit activity completion to backend:', err);
      }
    });

    return emittedSignals;
  }

  private evaluateCondition(condition: string, input: SignalEvaluationInput): boolean {
    if (condition === 'always') return true;
    if (condition === 'all-correct-first-attempt') {
      return input.attempts === input.totalDraggables;
    }
    if (condition.startsWith('score-gte:')) {
      if (condition.includes('threeStars')) return input.stars >= 3;
      if (condition.includes('twoStars')) return input.stars >= 2;
      if (condition.includes('oneStar')) return input.stars >= 1;
    }
    return true;
  }
}
