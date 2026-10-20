import { ActivityDefinition } from './activityDefinitions';
import { ActivityEngineResult } from '../types/pose.types';
import { PoseWindow } from '../pose/PoseWindow';
import { getPoseThresholds } from '../pose/thresholds';

export type SessionState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'paused'
  | 'completed'
  | 'timed_out'
  | 'failed'
  | 'cancelled';

export interface SessionEngineSnapshot {
  state: SessionState;
  definition: ActivityDefinition | null;
  countdownSec: number;
  holdProgressMs: number;
  currentReps: number;
  targetReps: number;
  /** Time left before a stuck child is moved on (resets on every rep). */
  remainingTimeoutMs: number;
  /** Hold needed per rep: the activity's, capped at `maxHoldMs`. */
  targetHoldMs: number;
  /** No progress for `hintAfterMs`: show the pose's coaching hint. */
  showHint: boolean;
  /** Rolling window state, for the debug view. */
  windowHits: number;
  windowFrames: number;
  windowPassing: boolean;
}

export class ActivitySessionEngine {
  private state: SessionState = 'idle';
  private definition: ActivityDefinition | null = null;
  private countdownSec = 3;
  private holdProgressMs = 0;
  private currentReps = 0;
  private remainingTimeoutMs = 30000;

  private lastFrameTimestamp = 0;
  private sinceProgressMs = 0;
  private window = new PoseWindow(getPoseThresholds().window);

  public startSession(definition: ActivityDefinition, countdownSec = 3): void {
    this.definition = definition;
    this.countdownSec = countdownSec;
    this.holdProgressMs = 0;
    this.currentReps = 0;
    this.remainingTimeoutMs = getPoseThresholds().stuckTimeoutMs;
    this.sinceProgressMs = 0;
    this.window = new PoseWindow(getPoseThresholds().window);
    this.lastFrameTimestamp = Date.now();
    this.state = 'starting';
  }

  public tickCountdown(): void {
    if (this.state !== 'starting') return;
    this.countdownSec -= 1;
    if (this.countdownSec <= 0) {
      this.state = 'running';
      this.lastFrameTimestamp = Date.now();
    }
  }

  /**
   * Hold time needed per rep. The catalog asks for 1500 ms of continuous hold;
   * combined with the window below that was far longer than a 3-year-old holds
   * a pose, so it is capped (`maxHoldMs`, 600 ms) — the window already requires
   * the pose to be mostly right for ~0.5 s.
   */
  private targetHoldMs(): number {
    const def = this.definition;
    return def ? Math.min(def.holdDurationMs, getPoseThresholds().maxHoldMs) : 0;
  }

  public evaluateFrame(evalResult: ActivityEngineResult, timestamp: number = Date.now()): void {
    if (this.state !== 'running' || !this.definition) return;
    const th = getPoseThresholds();

    // Clamp: a stalled camera (app backgrounded, dropped frames) must not jump
    // the hold or the stuck timer by seconds at once.
    const rawDelta = this.lastFrameTimestamp > 0 ? timestamp - this.lastFrameTimestamp : 16;
    const deltaMs = Math.max(0, Math.min(rawDelta, 200));
    this.lastFrameTimestamp = timestamp;

    /**
     * Stuck, not failed: after `stuckTimeoutMs` (30 s) without a rep the child
     * is moved on with "Great work! Let's try that later". Nothing is recorded
     * as a pass. The timer restarts on every rep, so a child who is getting
     * there is never cut off mid-way through a multi-rep activity.
     */
    this.sinceProgressMs += deltaMs;
    this.remainingTimeoutMs = th.stuckTimeoutMs - this.sinceProgressMs;
    if (this.remainingTimeoutMs <= 0) {
      this.state = 'timed_out';
      return;
    }

    // A frame hits when the pose scored at or above the pass mark (see
    // `activityDefinitions`: config poses report 0-1, primitives 0.6-1).
    const hit =
      (evalResult.state === 'detected' || evalResult.state === 'completed') &&
      evalResult.confidence >= this.definition.confidenceThreshold;

    this.window.push(hit, timestamp);

    /**
     * Forgiving hold. A miss used to drain progress 1.5x faster than a hit
     * filled it, so one wobble undid two good frames and a slightly unsteady
     * child never finished. Now a miss drains at `holdDecay` (0.5x), and the rep
     * also needs the rolling window — 8 of the last 12 frames — to pass, so the
     * hold cannot be completed by scattered lucky frames either.
     */
    if (hit) {
      this.holdProgressMs += deltaMs;
    } else {
      this.holdProgressMs = Math.max(0, this.holdProgressMs - deltaMs * th.holdDecay);
    }

    const target = this.targetHoldMs();
    if (this.holdProgressMs >= target && this.window.isPassing()) {
      this.currentReps += 1;
      this.holdProgressMs = 0;
      this.window.reset();
      this.sinceProgressMs = 0;
      if (this.currentReps >= this.definition.repetitions) {
        this.state = 'completed';
      }
    } else if (this.holdProgressMs > target) {
      // Hold met but the window is not yet convinced: keep the ring full.
      this.holdProgressMs = target;
    }
  }

  public pauseSession(): void {
    if (this.state === 'running' || this.state === 'starting') {
      this.state = 'paused';
    }
  }

  public resumeSession(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      this.lastFrameTimestamp = Date.now();
    }
  }

  public cancelSession(): void {
    this.state = 'cancelled';
  }

  public resetSession(): void {
    this.state = 'idle';
    this.definition = null;
    this.countdownSec = 3;
    this.holdProgressMs = 0;
    this.currentReps = 0;
    this.remainingTimeoutMs = 30000;
    this.sinceProgressMs = 0;
    this.window.reset();
  }

  public getSnapshot(): SessionEngineSnapshot {
    return {
      state: this.state,
      definition: this.definition,
      countdownSec: this.countdownSec,
      holdProgressMs: this.holdProgressMs,
      currentReps: this.currentReps,
      targetReps: this.definition?.repetitions ?? 1,
      remainingTimeoutMs: Math.max(0, this.remainingTimeoutMs),
      targetHoldMs: this.targetHoldMs(),
      showHint: this.state === 'running' && this.sinceProgressMs >= getPoseThresholds().hintAfterMs,
      windowHits: this.window.hits,
      windowFrames: this.window.length,
      windowPassing: this.window.isPassing(),
    };
  }
}
