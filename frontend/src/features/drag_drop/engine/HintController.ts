/**
 * Hint Controller — PetalPath Drag & Drop Subsystem
 * Manages progressive hints (levels 1-3) and idle timers via EventBus observer.
 */

import { HintConfig, ProgressiveHint } from '../types';
import { ActivityEventBus } from '../../../core/event-bus/eventBus';

export class HintController {
  private activeHintLevel = 0;
  private activeHint: ProgressiveHint | null = null;
  private attemptCount = 0;
  private idleTimer: any = null;
  private unsubscribeFn: (() => void) | null = null;

  constructor(
    private config: HintConfig | undefined,
    private eventBus: ActivityEventBus,
    private onHintTriggered?: (hint: ProgressiveHint | { type: 'idle'; hintType: string }) => void
  ) {}

  attach(): void {
    if (!this.config || !this.config.enabled) return;

    this.resetIdleTimer();

    const unsubs = [
      this.eventBus.on('VALIDATION_FAILED', () => {
        this.attemptCount += 1;
        this.checkProgressiveHints();
        this.resetIdleTimer();
      }),
      this.eventBus.on('VALIDATION_PASSED', () => {
        this.resetIdleTimer();
      }),
      this.eventBus.on('DRAG_MOVED', () => {
        this.resetIdleTimer();
      }),
    ];

    this.unsubscribeFn = () => {
      unsubs.forEach((unsub) => unsub());
      this.clearIdleTimer();
    };
  }

  private checkProgressiveHints(): void {
    if (!this.config?.progressiveHints) return;

    const eligibleHint = this.config.progressiveHints.find(
      (h) => this.attemptCount >= h.triggerAfterAttempts && h.level > this.activeHintLevel
    );

    if (eligibleHint) {
      this.activeHintLevel = eligibleHint.level;
      this.activeHint = eligibleHint;
      this.eventBus.emit('HINT_TRIGGERED', { hint: eligibleHint });
      if (this.onHintTriggered) {
        this.onHintTriggered(eligibleHint);
      }
    }
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    if (!this.config?.idleHint?.enabled) return;

    const timeout = this.config.idleHint.idleTimeoutMs || 8000;
    this.idleTimer = setTimeout(() => {
      this.eventBus.emit('HINT_TRIGGERED', { hintType: this.config!.idleHint!.hintType });
      if (this.onHintTriggered) {
        this.onHintTriggered({ type: 'idle', hintType: this.config!.idleHint!.hintType });
      }
    }, timeout);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  getActiveHint(): ProgressiveHint | null {
    return this.activeHint;
  }

  detach(): void {
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = null;
    }
    this.clearIdleTimer();
  }
}
