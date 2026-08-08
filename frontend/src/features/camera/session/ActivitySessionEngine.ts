import { ActivityDefinition } from './activityDefinitions';
import { ActivityEngineResult } from '../types/pose.types';

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
  remainingTimeoutMs: number;
}

export class ActivitySessionEngine {
  private state: SessionState = 'idle';
  private definition: ActivityDefinition | null = null;
  private countdownSec = 3;
  private holdProgressMs = 0;
  private currentReps = 0;
  private remainingTimeoutMs = 30000;

  private lastFrameTimestamp = 0;

  public startSession(definition: ActivityDefinition, countdownSec = 3): void {
    this.definition = definition;
    this.countdownSec = countdownSec;
    this.holdProgressMs = 0;
    this.currentReps = 0;
    this.remainingTimeoutMs = definition.timeoutMs;
    this.lastFrameTimestamp = Date.now();
    this.state = countdownSec <= 0 ? 'running' : 'starting';
  }

  public tickCountdown(): void {
    if (this.state !== 'starting') return;
    this.countdownSec -= 1;
    if (this.countdownSec <= 0) {
      this.state = 'running';
      this.lastFrameTimestamp = Date.now();
    }
  }

  public evaluateFrame(evalResult: ActivityEngineResult, timestamp: number = Date.now()): void {
    if (this.state !== 'running' || !this.definition) return;

    const deltaMs = this.lastFrameTimestamp > 0 ? timestamp - this.lastFrameTimestamp : 16;
    this.lastFrameTimestamp = timestamp;

    // Check timeout
    this.remainingTimeoutMs -= deltaMs;
    if (this.remainingTimeoutMs <= 0) {
      this.state = 'timed_out';
      return;
    }

    if (evalResult.state === 'detected' || evalResult.state === 'completed') {
      this.holdProgressMs += deltaMs;

      // Check if hold duration criteria met
      if (this.holdProgressMs >= this.definition.holdDurationMs) {
        this.currentReps += 1;
        this.holdProgressMs = 0;

        if (this.currentReps >= this.definition.repetitions) {
          this.state = 'completed';
        }
      }
    } else {
      // Decay hold progress when pose is lost to enforce continuous hold
      this.holdProgressMs = Math.max(0, this.holdProgressMs - deltaMs * 1.5);
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
    };
  }
}
