/**
 * Daily usage timer, with an injectable clock.
 *
 *   npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UsageTimer, localDay, msUntilLocalMidnight, type UsageClock } from '../usageTimer';

const MIN = 60_000;

/** A clock the test drives: monotonic and wall time move independently. */
class FakeClock implements UsageClock {
  mono = 1_000;
  constructor(public wallMs: number) {}
  monotonic() {
    return this.mono;
  }
  wall() {
    return this.wallMs;
  }
  /** Real time passing: both clocks move. */
  advance(ms: number) {
    this.mono += ms;
    this.wallMs += ms;
  }
}

/** Local times, so the tests pass in any timezone. */
const at = (h: number, m = 0, day = 23) => new Date(2026, 9, day, h, m, 0, 0).getTime();

/** Counts `minutes` of learning, ticking once a second like the app does. */
function learn(timer: UsageTimer, clock: FakeClock, childId: string, minutes: number) {
  timer.start(childId);
  for (let s = 0; s < minutes * 60; s++) {
    clock.advance(1_000);
    timer.tick();
  }
}

describe('usage timer', () => {
  it('accumulates learning time and locks at the default 20 minutes', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 19);
    assert.equal(t.status('a').locked, false);
    assert.equal(t.status('a').remainingMs, 1 * MIN);
    learn(t, clock, 'a', 1);
    assert.equal(t.status('a').locked, true);
    assert.equal(t.status('a').usedMs, 20 * MIN);
  });

  it('pauses while backgrounded: time away is not counted', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 5);
    t.pause(); // app backgrounded / screen off
    clock.advance(30 * MIN);
    assert.equal(t.status('a').usedMs, 5 * MIN);
    learn(t, clock, 'a', 2);
    assert.equal(t.status('a').usedMs, 7 * MIN);
  });

  it('a frozen process never adds more than one tick of time', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock, null, { maxTickMs: 5_000 });
    t.start('a');
    clock.advance(45 * MIN); // e.g. screen off without a pause event
    t.tick();
    assert.equal(t.status('a').usedMs, 5_000);
  });

  it('survives the app being killed and restarted: the lock still applies', () => {
    const clock = new FakeClock(at(10));
    const t1 = new UsageTimer(clock);
    learn(t1, clock, 'a', 20);
    const saved = JSON.parse(JSON.stringify(t1.snapshot())); // persisted, then the app dies

    // Relaunch: a new process, the monotonic clock starts from a new origin.
    const relaunched = new FakeClock(at(11));
    relaunched.mono = 5;
    const t2 = new UsageTimer(relaunched, saved);
    assert.equal(t2.status('a').locked, true);
    assert.equal(t2.status('a').usedMs, 20 * MIN);
  });

  it('keeps counting correctly after a restart mid-allowance', () => {
    const clock = new FakeClock(at(10));
    const t1 = new UsageTimer(clock);
    learn(t1, clock, 'a', 12);
    const t2 = new UsageTimer(clock, t1.snapshot());
    learn(t2, clock, 'a', 3);
    assert.equal(t2.status('a').usedMs, 15 * MIN);
  });

  it('resets at local midnight, including while counting across it', () => {
    const clock = new FakeClock(at(23, 30));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 20); // 23:30 → 23:50
    t.pause();
    assert.equal(t.status('a').locked, true);
    clock.advance(20 * MIN); // 00:10 on the next day
    assert.equal(localDay(clock.wall()), localDay(at(0, 10, 24)));
    assert.equal(t.status('a').locked, false);
    assert.equal(t.status('a').usedMs, 0);

    const clock2 = new FakeClock(at(23, 55));
    const t2 = new UsageTimer(clock2);
    learn(t2, clock2, 'b', 10); // 23:55 → 00:05
    // Only the minutes after midnight count for the new day (to within the
    // one tick that straddles midnight).
    assert.ok(Math.abs(t2.status('b').usedMs - 5 * MIN) <= 1_000, `${t2.status('b').usedMs}`);
  });

  it('reports the time until the reset', () => {
    assert.equal(msUntilLocalMidnight(at(22, 30)), 90 * MIN);
  });

  it('does not reset when the device date is moved backwards', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 20);
    clock.wallMs = at(10, 0, 22); // set back a day; monotonic time is unaffected
    assert.equal(t.status('a').locked, true);
    assert.equal(t.status('a').usedMs, 20 * MIN);
    clock.wallMs = at(9); // back to "today" but earlier
    assert.equal(t.status('a').locked, true);
  });

  it('a clock moved backwards adds and removes no learning time', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    t.start('a');
    clock.mono += 60_000; // one real minute of learning, ticked each second
    for (let i = 0; i < 60; i++) {
      t.tick();
    }
    clock.wallMs -= 3 * 60 * MIN; // date/time changed during the session
    t.tick();
    assert.equal(t.status('a').usedMs, 5_000, 'the jump in wall time is ignored; only monotonic time counts');
  });

  it('gives siblings separate allowances', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    learn(t, clock, 'asha', 20);
    assert.equal(t.status('asha').locked, true);
    assert.equal(t.status('ravi').locked, false);
    learn(t, clock, 'ravi', 5); // switching child flushes and starts the other counter
    assert.equal(t.status('ravi').usedMs, 5 * MIN);
    assert.equal(t.status('asha').usedMs, 20 * MIN);
  });

  it('applies a limit changed mid-day immediately', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 15);
    t.setLimit('a', 10);
    assert.equal(t.status('a').locked, true);
    t.setLimit('a', 30);
    assert.equal(t.status('a').locked, false);
    assert.equal(t.status('a').remainingMs, 15 * MIN);
  });

  it('keeps the limit between 10 and 60 minutes', () => {
    const t = new UsageTimer(new FakeClock(at(10)));
    t.setLimit('a', 5);
    assert.equal(t.settings('a').limitMinutes, 10);
    t.setLimit('a', 90);
    assert.equal(t.settings('a').limitMinutes, 60);
    t.setLimitUnchecked('a', 1); // debug builds only
    assert.equal(t.settings('a').limitMinutes, 1);
  });

  it('grants 10 extra minutes for today only', () => {
    const clock = new FakeClock(at(15));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 20);
    t.grantExtra('a');
    assert.equal(t.status('a').locked, false);
    assert.equal(t.status('a').remainingMs, 10 * MIN);
    learn(t, clock, 'a', 10);
    assert.equal(t.status('a').locked, true);
    // Next day: back to the plain 20 minutes.
    clock.wallMs = at(9, 0, 24);
    assert.equal(t.status('a').limitMs, 20 * MIN);
  });

  it('can turn the limit off', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 20);
    t.setEnabled('a', false);
    assert.equal(t.status('a').locked, false);
    learn(t, clock, 'a', 30);
    assert.equal(t.status('a').locked, false);
  });

  it('warns once, at two minutes left', () => {
    const clock = new FakeClock(at(10));
    const t = new UsageTimer(clock);
    learn(t, clock, 'a', 17);
    assert.equal(t.status('a').shouldWarn, false);
    learn(t, clock, 'a', 1);
    assert.equal(t.status('a').shouldWarn, true);
    t.markWarned('a');
    assert.equal(t.status('a').shouldWarn, false);
  });
});
