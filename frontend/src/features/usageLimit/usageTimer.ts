/**
 * Daily learning-time allowance, per child. Pure: the clock is injected, so
 * every rule here is unit-tested (features/usageLimit/__tests__).
 *
 * Two clocks, for two different jobs:
 *  - `monotonic()` measures elapsed time. It cannot be wound back or forward
 *    by changing the device's clock, so changing the time never adds or
 *    removes learning minutes.
 *  - `wall()` only answers "which local day is it?", to reset at midnight.
 *    A counter belongs to a day; it resets only when the local date moves
 *    *forward* past that day. If the date moves backwards, the counter is
 *    kept — winding the clock back is not a way to get more time.
 *
 * Counting happens between `start()` and `pause()`; the controller starts it
 * only while the app is in the foreground on a learning screen. `tick()` is
 * called about once a second while counting. A single tick never adds more
 * than `maxTickMs`, so a process frozen in the background without a pause
 * (e.g. the screen switched off) does not come back with hours of usage.
 */

export interface UsageClock {
  /** Milliseconds from an arbitrary origin that only ever moves forward. */
  monotonic(): number;
  /** Epoch milliseconds (device clock); only used for the local date. */
  wall(): number;
}

export interface ChildUsage {
  /** Local date (YYYY-MM-DD) this counter belongs to. */
  day: string;
  usedMs: number;
  /** Extra time a parent granted for `day`. */
  extraMs: number;
  limitMinutes: number;
  enabled: boolean;
  /** The two-minute warning has been shown for `day`. */
  warned: boolean;
}

export interface UsageState {
  version: 1;
  children: Record<string, ChildUsage>;
}

export interface UsageStatus {
  enabled: boolean;
  usedMs: number;
  limitMs: number;
  remainingMs: number;
  locked: boolean;
  /** Within the warning window and not yet warned today. */
  shouldWarn: boolean;
  /** Until local midnight, when the allowance resets. */
  resetsInMs: number;
}

export const LIMIT_MIN_MINUTES = 10;
export const LIMIT_MAX_MINUTES = 60;
export const DEFAULT_LIMIT_MINUTES = 20;
export const EXTRA_MINUTES = 10;
export const WARN_BEFORE_MS = 2 * 60_000;
const MINUTE = 60_000;

export interface UsageTimerOptions {
  maxTickMs: number;
}

const DEFAULT_OPTIONS: UsageTimerOptions = { maxTickMs: 5_000 };

/** Local calendar date, YYYY-MM-DD (sorts as a string). */
export function localDay(wallMs: number): string {
  const d = new Date(wallMs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Milliseconds from `wallMs` to the next local midnight. */
export function msUntilLocalMidnight(wallMs: number): number {
  const d = new Date(wallMs);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - wallMs);
}

export const clampLimit = (minutes: number) =>
  Math.min(LIMIT_MAX_MINUTES, Math.max(LIMIT_MIN_MINUTES, Math.round(minutes)));

export class UsageTimer {
  private state: UsageState;
  private counting: { childId: string; since: number } | null = null;
  private readonly options: UsageTimerOptions;

  constructor(
    private readonly clock: UsageClock,
    state?: UsageState | null,
    options: Partial<UsageTimerOptions> = {},
  ) {
    this.state = state && state.version === 1 && state.children ? structuredCloneSafe(state) : { version: 1, children: {} };
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Serializable copy for persistence. */
  snapshot(): UsageState {
    return structuredCloneSafe(this.state);
  }

  isCounting(): boolean {
    return this.counting !== null;
  }

  /** The child's record for today, creating or rolling it over as needed. */
  private child(childId: string): ChildUsage {
    const today = localDay(this.clock.wall());
    let c = this.state.children[childId];
    if (!c) {
      c = { day: today, usedMs: 0, extraMs: 0, limitMinutes: DEFAULT_LIMIT_MINUTES, enabled: true, warned: false };
      this.state.children[childId] = c;
    } else if (today > c.day) {
      // A new day (forward only): the allowance resets; settings carry over.
      c.day = today;
      c.usedMs = 0;
      c.extraMs = 0;
      c.warned = false;
    }
    return c;
  }

  /** Begin counting for a child. Switching child flushes the previous one. */
  start(childId: string): void {
    if (this.counting?.childId === childId) return;
    this.pause();
    this.child(childId);
    this.counting = { childId, since: this.clock.monotonic() };
  }

  /** Add the time since the last mark to the counting child, and keep counting. */
  tick(): void {
    if (!this.counting) return;
    const now = this.clock.monotonic();
    const delta = Math.min(Math.max(0, now - this.counting.since), this.options.maxTickMs);
    this.counting.since = now;
    // Read the day *after* measuring: time spent across midnight goes to the new day.
    const c = this.child(this.counting.childId);
    if (c.enabled) c.usedMs += delta;
  }

  /** Stop counting (app backgrounded, screen off, left a learning screen). */
  pause(): void {
    if (!this.counting) return;
    this.tick();
    this.counting = null;
  }

  status(childId: string): UsageStatus {
    const c = this.child(childId);
    const limitMs = c.limitMinutes * MINUTE + c.extraMs;
    const remainingMs = Math.max(0, limitMs - c.usedMs);
    const locked = c.enabled && remainingMs <= 0;
    return {
      enabled: c.enabled,
      usedMs: c.usedMs,
      limitMs,
      remainingMs,
      locked,
      shouldWarn: c.enabled && !locked && !c.warned && remainingMs <= WARN_BEFORE_MS,
      resetsInMs: msUntilLocalMidnight(this.clock.wall()),
    };
  }

  markWarned(childId: string): void {
    this.child(childId).warned = true;
  }

  /** Parent gate: extra time for today only. */
  grantExtra(childId: string, minutes: number = EXTRA_MINUTES): void {
    this.tick();
    const c = this.child(childId);
    // Extra time counts from now: if the child was already over the limit
    // (e.g. a long final tick), they still get the full extra minutes.
    const over = Math.max(0, c.usedMs - (c.limitMinutes * MINUTE + c.extraMs));
    c.extraMs += minutes * MINUTE + over;
    c.warned = false;
  }

  /** Parent gate: daily limit, 10-60 minutes. Applies immediately to today. */
  setLimit(childId: string, minutes: number): void {
    this.tick();
    const c = this.child(childId);
    c.limitMinutes = clampLimit(minutes);
    c.warned = false;
  }

  /** Debug builds only: any limit, e.g. 1 minute to test the lock quickly. */
  setLimitUnchecked(childId: string, minutes: number): void {
    this.tick();
    const c = this.child(childId);
    c.limitMinutes = Math.max(1, Math.round(minutes));
    c.warned = false;
  }

  /** Parent gate: turn the daily limit off (or on again). */
  setEnabled(childId: string, enabled: boolean): void {
    this.tick();
    this.child(childId).enabled = enabled;
  }

  settings(childId: string): { limitMinutes: number; enabled: boolean } {
    const c = this.child(childId);
    return { limitMinutes: c.limitMinutes, enabled: c.enabled };
  }
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** The real clocks. `performance.now()` is monotonic in React Native (Hermes). */
export const systemClock: UsageClock = {
  monotonic: () =>
    typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : Date.now(),
  wall: () => Date.now(),
};
