/*
 * Harness for the unified adaptive engine's pure logic.
 *
 * Every function called here is the real, unmodified source, transpiled by tsc.
 * Nothing is reimplemented in this file: the assertions describe behaviour, and
 * if the behaviour changes the assertions fail.
 *
 * The one database-shaped detail the harness supplies itself is the accuracy
 * *history* — `calculateConsistencyScore` reads `SkillHistory` — but the formula
 * applied to that history is the real `mastery-scoring.consistencyScore`, the
 * same function both live call sites use.
 */
import {
  computeLessonEvidence,
  requiredSessionsFor,
  starsToAccuracy,
  expectedModalitiesOf,
} from './modules/progress/lesson-evidence.js';
import { evaluateUnlock, describeUnlockDecision } from './modules/curriculum/unlock-policy.js';
import {
  localDayIndex,
  addCalendarDays,
  calendarDaysBetween,
  isSameLocalDay,
  isDue,
  elapsedDays,
  startOfLocalDay,
} from './shared/utils/calendar-day.js';
import { masteryEngineService as m } from './modules/mastery/mastery.service.js';
import * as scoring from './modules/mastery/mastery-scoring.js';
import * as cadence from './modules/mastery/review-cadence.js';
import { planReviews, describePracticeSession } from './modules/roadmap/review-plan.js';
import { buildGarden, BLOOM_STAGES } from './modules/curriculum/garden-view.js';
import { toSkillMasteryView, toSkillMasteryViews } from './modules/mastery/mastery.view.js';
import {
  modalityScore,
  profileModalities,
  foldObservation,
} from './modules/adaptive/modality-profile.js';
import { ActivityType } from './shared/enums.js';
import { engineConfig } from './shared/config/engine.config.js';

const r1 = (n) => Math.round(n * 10) / 10;
const line = (s) => console.log('\n' + s + '\n' + '-'.repeat(s.length));

let failures = 0;
function check(label, actual, expected) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (!ok) failures++;
  const shown = typeof actual === 'object' ? JSON.stringify(actual) : actual;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} = ${shown}`);
}

const IST = engineConfig.unified.review.timezoneOffsetMinutes;

// ---------------------------------------------------------------------------
// helpers that only build input records (no logic)
// ---------------------------------------------------------------------------
const T0 = new Date('2026-08-22T09:00:00.000Z');
const at = (minutes) => new Date(T0.getTime() + minutes * 60_000);

function signal(modality, opts = {}) {
  return {
    modality,
    expected: opts.expected ?? true,
    completed: opts.completed ?? false,
    stars: opts.stars ?? 0,
    score: opts.score ?? null,
    cumulativeAttempts: opts.cumulativeAttempts ?? null,
    attempted: opts.attempted ?? (opts.completed ?? false),
    lastActivityAt: opts.lastActivityAt ?? null,
  };
}

/** A whole four-modality lesson finished at a uniform star level. */
function fullLesson(stars, { score = null, attemptsEach = 1 } = {}) {
  return [
    signal('video', { completed: true, stars, cumulativeAttempts: attemptsEach, lastActivityAt: at(0) }),
    signal('listen', { completed: true, stars, cumulativeAttempts: attemptsEach, lastActivityAt: at(2) }),
    signal('speak', { completed: true, stars, score, cumulativeAttempts: attemptsEach, lastActivityAt: at(4) }),
    signal('write', { completed: true, stars, score, cumulativeAttempts: attemptsEach, lastActivityAt: at(6) }),
  ];
}

const ALL_FOUR = ['video', 'listen', 'speak', 'write'];

/**
 * The composition `evaluateMastery` performs: five dimensions -> weighted score
 * -> band, including the unproven-evidence ceiling from Stage 1.
 */
function scoreFromEvidence(ev, { previousHealth = null, history = [], now = T0 } = {}) {
  const knowledgeScore = m.calculateKnowledgeScore(ev.accuracy);
  const retentionScore = m.calculateRetentionScore(previousHealth, now, ev.accuracy);
  const confidenceScore = m.calculateConfidenceScore({
    accuracy: ev.accuracy,
    attempts: ev.attempts,
    retries: ev.retries,
    helpRequests: ev.helpRequests,
  });
  // The real formula over the window the live code would have read from
  // `SkillHistory`: mean less volatility.
  const consistency = scoring.consistencyScore([ev.accuracy, ...history]);
  const raw = m.calculateMasteryScore({
    knowledgeScore,
    retentionScore,
    confidenceScore,
    engagementScore: ev.engagementScore,
    consistencyScore: consistency.score,
  });
  const ceiling = engineConfig.unified.evidence.unprovenScoreCeiling;
  const score = ev.masteryProven ? raw : Math.min(raw, ceiling);
  return {
    dims: {
      knowledge: r1(knowledgeScore),
      retention: r1(retentionScore),
      confidence: r1(confidenceScore),
      engagement: r1(ev.engagementScore),
      consistency: r1(consistency.score),
    },
    raw: r1(raw),
    score: r1(score),
    state: m.determineMasteryState(score),
  };
}

function report(name, ev, composed) {
  console.log(
    `  ${name}\n` +
      `      accuracy ${r1(ev.accuracy)}  engagement ${ev.engagementScore}  attempts ${ev.attempts}  ` +
      `retries ${ev.retries}  duration ${ev.sessionDuration}s  responseTime ${ev.responseTime}s\n` +
      `      coverage ${ev.completedCount}/${ev.expectedCount}  sessions ${ev.sessionsWithEvidence}/${ev.requiredSessions}  ` +
      `proven ${ev.masteryProven}  realScore ${ev.hasRealScore}\n` +
      `      dims ${JSON.stringify(composed.dims)}\n` +
      `      raw ${composed.raw} -> score ${composed.score} -> ${composed.state}`
  );
}

// ===========================================================================
line('0. CONFIG — the unified block the new code reads');
// ===========================================================================
console.log('  review  ', JSON.stringify(engineConfig.unified.review));
console.log('  unlock  ', JSON.stringify(engineConfig.unified.unlock));
console.log('  evidence', JSON.stringify(engineConfig.unified.evidence));
console.log('  roadmap ', JSON.stringify(engineConfig.unified.roadmap));
check('STRONG cadence is 2 days', engineConfig.unified.review.cadenceDaysByState.STRONG, 2);
check('WEAK cadence is 1 day', engineConfig.unified.review.cadenceDaysByState.WEAK, 1);

// ===========================================================================
line('1. starsToAccuracy — star bands inverted, not stars/3');
// ===========================================================================
for (const s of [0, 1, 2, 3]) {
  console.log(`  ${s}* completed   -> ${starsToAccuracy(s, true)}   (old formula: ${Math.round((s / 3) * 100)})`);
}
check('0* not completed reads as 0', starsToAccuracy(0, false), 0);
check('1* is inside the 40-59 band', starsToAccuracy(1, true), (v) => v >= 40 && v < 60);

// ===========================================================================
line('2. expectedModalitiesOf — normalization, and drag_drop excluded');
// ===========================================================================
check(
  'trace/tap/watch normalize',
  expectedModalitiesOf([{ type: 'watch' }, { type: 'tap' }, { type: 'trace' }]),
  (v) => JSON.stringify(v) === JSON.stringify(['video', 'listen', 'write'])
);
check(
  'drag_drop is not expected (nothing records it)',
  expectedModalitiesOf([{ type: 'drag_drop' }, { type: 'video' }]),
  (v) => JSON.stringify(v) === JSON.stringify(['video'])
);

// ===========================================================================
line('3. WORKED EXAMPLES — a first pass through a four-activity lesson');
// ===========================================================================
const base = { expectedModalities: ALL_FOUR, priorAttemptTotal: 0, priorSessions: 0, estimatedMinutes: 5 };

const evNothing = computeLessonEvidence({ ...base, signals: ALL_FOUR.map((k) => signal(k)) });
const cNothing = scoreFromEvidence(evNothing);
report('A. pressed Complete having done nothing', evNothing, cNothing);

const ev1 = computeLessonEvidence({ ...base, signals: fullLesson(1) });
const c1 = scoreFromEvidence(ev1);
report('B. all four activities at 1 star', ev1, c1);

const ev3 = computeLessonEvidence({ ...base, signals: fullLesson(3, { score: 92 }) });
const c3 = scoreFromEvidence(ev3);
report('C. all four at 3 stars, speak/write measured 92', ev3, c3);

const evHalf = computeLessonEvidence({
  ...base,
  signals: [
    signal('video', { completed: true, stars: 3, cumulativeAttempts: 1, lastActivityAt: at(0) }),
    signal('listen', { completed: true, stars: 2, cumulativeAttempts: 1, lastActivityAt: at(3) }),
    signal('speak', { attempted: true, stars: 0, score: 20, cumulativeAttempts: 4, lastActivityAt: at(7) }),
    signal('write', {}),
  ],
});
const cHalf = scoreFromEvidence(evHalf);
report('D. gave up on speak, never opened write', evHalf, cHalf);

console.log('');
check('A and C do not land in the same band', cNothing.state !== c3.state, true);
check('1-star pass scores below a 3-star pass', c1.score < c3.score, true);
check('doing nothing scores below a 1-star pass', cNothing.score < c1.score, true);
check('unproven first pass cannot reach MASTERED', c3.state !== 'MASTERED', true);
check('unproven score is clamped to the ceiling', c3.score <= engineConfig.unified.evidence.unprovenScoreCeiling, true);
check('abandoning speak is visible in engagement', evHalf.engagementScore < ev3.engagementScore, true);
// Six attempts across three tracked activities: three are the expected first
// cost of doing the work, so three are genuine retries (all on speak).
check('retries count attempts beyond the first per activity', evHalf.retries, 3);
check('doing nothing yields no real score', evNothing.hasRealScore, false);
check('doing nothing yields no time on task', evNothing.sessionDuration, 0);
check('doing nothing yields no engagement', evNothing.engagementScore, 0);

// ===========================================================================
line('4. EVIDENCE SUFFICIENCY — how many sessions prove mastery, and why');
// ===========================================================================
console.log(
  '  `base` declares no difficulty, so it asks for the default 3 sessions — the\n' +
  '  behaviour every case below and in section 3 was calibrated against. What\n' +
  '  difficulty changes is examined straight after.\n'
);
for (const priorSessions of [0, 1, 2, 3]) {
  const ev = computeLessonEvidence({
    ...base,
    priorSessions,
    priorAttemptTotal: priorSessions * 4,
    signals: fullLesson(3, { score: 95, attemptsEach: priorSessions + 1 }),
  });
  const c = scoreFromEvidence(ev, { history: Array(priorSessions).fill(95) });
  console.log(
    `  prior sessions ${priorSessions} -> sessions ${ev.sessionsWithEvidence}/${ev.requiredSessions}  ` +
      `proven ${String(ev.masteryProven).padEnd(5)} raw ${String(c.raw).padStart(5)} -> ${String(c.score).padStart(5)} ${c.state}`
  );
}
const evProven = computeLessonEvidence({
  ...base,
  priorSessions: 2,
  priorAttemptTotal: 8,
  signals: fullLesson(3, { score: 98, attemptsEach: 3 }),
});
check('a third full pass is proven', evProven.masteryProven, true);
check(
  'proven evidence is no longer clamped',
  scoreFromEvidence(evProven, { history: [98, 98] }).score >
    engineConfig.unified.evidence.unprovenScoreCeiling,
  true
);

// ---------------------------------------------------------------------------
// Which authored field decides. `mastery.attempts` reads 3 on all 1209 nodes
// and `mastery.required_score` reads 80 on all 1209, so trusting `attempts` as
// a per-node judgement makes every lesson identical. `difficulty` is the only
// field with a real spread (1:100, 2:397, 3:467, 4:159, 5:86).
console.log('\n  REQUIRED SESSIONS — difficulty decides, `attempts` overrides when authored');
const EV = engineConfig.unified.evidence;
for (const level of [1, 2, 3, 4, 5]) {
  console.log(
    `    difficulty ${level} -> ${requiredSessionsFor(level, 3)} session(s)` +
      `   (table says ${EV.requiredSessionsByDifficulty[level]})`
  );
}
check('an easy lesson asks for two passes, not three', requiredSessionsFor(1, 3), 2);
check('a middling lesson still asks for three', requiredSessionsFor(3, 3), 3);
check('the hardest lessons ask for four', requiredSessionsFor(5, 3), 4);
// The trap this avoids: every node declares 3, so a plain
// max(declared, byDifficulty) would floor the whole table back to 3 and make
// the feature inert. `attempts` only wins when it *differs* from the default.
check(
  'the global default 3 does not override the difficulty table',
  requiredSessionsFor(1, EV.defaultRequiredAttempts),
  2
);
check(
  'but a deliberately authored 5 does',
  requiredSessionsFor(1, 5),
  5
);
check('a node with no difficulty falls back to the default', requiredSessionsFor(null, null), 3);
check('an out-of-range difficulty falls back rather than reading undefined', requiredSessionsFor(9, 3), 3);
// The anti-lucky-run floor is separate from the difficulty question: two
// sessions is the minimum any lesson can be proven in, whatever it declares.
check('nothing can be proven in a single session', requiredSessionsFor(1, 1), EV.minSessionsForMastered);
check('and that floor is 2, low enough to leave the table meaningful', EV.minSessionsForMastered, 2);

const easy = (priorSessions, difficulty) =>
  computeLessonEvidence({
    ...base,
    difficulty,
    requiredAttempts: 3,
    priorSessions,
    priorAttemptTotal: priorSessions * 4,
    signals: fullLesson(3, { score: 95, attemptsEach: priorSessions + 1 }),
  });
console.log(
  `    a difficulty-1 lesson, second full pass  -> proven ${easy(1, 1).masteryProven}\n` +
  `    a difficulty-5 lesson, second full pass  -> proven ${easy(1, 5).masteryProven}\n` +
  `    a difficulty-5 lesson, fourth full pass  -> proven ${easy(3, 5).masteryProven}`
);
check('an easy lesson can be finished with the engine sooner', easy(1, 1).masteryProven, true);
check('a hard lesson cannot', easy(1, 5).masteryProven, false);
check('but four passes settle it', easy(3, 5).masteryProven, true);
check(
  'and MASTERED follows the evidence, not just the score',
  scoreFromEvidence(easy(1, 1), { history: [95] }).state,
  'MASTERED'
);
check(
  'the same second pass on a hard lesson is still clamped',
  scoreFromEvidence(easy(1, 5), { history: [95] }).score,
  EV.unprovenScoreCeiling
);

// ===========================================================================
line('5. SCORING DIMENSIONS — every point has to be earned from evidence');
// ===========================================================================
const conf = (accuracy, attempts, retries, helpRequests) =>
  m.calculateConfidenceScore({ accuracy, attempts, retries, helpRequests });

console.log('  CONFIDENCE — accuracy scaled by independence and directness');
for (const [name, a, at, re, he] of [
  ['did nothing at all', 0, 1, 0, 0],
  ['right, first time, unaided', 90, 4, 0, 0],
  ['right, but after three retries', 90, 6, 3, 0],
  ['right, but leaned on help throughout', 90, 4, 0, 5],
  ['half right, unaided', 50, 4, 0, 0],
  ['one retry in a one-attempt window', 80, 1, 1, 0],
]) {
  console.log(`    ${name.padEnd(38)} = ${String(r1(conf(a, at, re, he))).padStart(5)}`);
}
check('inaction no longer scores a perfect 100', conf(0, 1, 0, 0), 0);
check('being right unaided scores the accuracy', conf(90, 4, 0, 0), 90);
check('retries cost confidence', conf(90, 6, 3, 0) < conf(90, 6, 0, 0), true);
check('help costs confidence', conf(90, 4, 0, 5) < conf(90, 4, 0, 0), true);
// The retry ceiling stops a small window from being catastrophic: one retry out
// of one attempt is a stumble, not a collapse.
check('one retry in a tiny window is a stumble, not a collapse', conf(80, 1, 1, 0) >= 70, true);
check('confidence can never exceed accuracy', conf(50, 4, 0, 0) <= 50, true);

console.log('\n  RETENTION — a baseline nothing has yet retained must not read 100');
const weekLater = new Date(T0.getTime() + 7 * 86_400_000);
const memory = (retentionScore) => ({ retentionScore, lastPracticed: T0, decayFactor: null });
console.log(`    first session, accuracy 0        = ${r1(m.calculateRetentionScore(null, T0, 0))}`);
console.log(`    first session, accuracy 80       = ${r1(m.calculateRetentionScore(null, T0, 80))}`);
console.log(`    first session, accuracy 100      = ${r1(m.calculateRetentionScore(null, T0, 100))}`);
console.log(`    90 retained, +7d idle, scores 90 = ${r1(m.calculateRetentionScore(memory(90), weekLater, 90))}`);
console.log(`    90 retained, +7d idle, scores 50 = ${r1(m.calculateRetentionScore(memory(90), weekLater, 50))}`);
console.log(`    0 retained, one perfect session  = ${r1(m.calculateRetentionScore(memory(0), weekLater, 100))}`);
check('a first-ever success no longer asserts perfect retention', m.calculateRetentionScore(null, T0, 80), 80);
check('a lesson that went badly retains nothing', m.calculateRetentionScore(null, T0, 0), 0);
check(
  'a decayed memory is rebuilt in steps, not restored by one good day',
  m.calculateRetentionScore(memory(0), weekLater, 100),
  engineConfig.mastery.retention.successBoost
);
check(
  'idle time lowers retention',
  m.calculateRetentionScore(memory(90), weekLater, 50) < 90,
  true
);

console.log('\n  CONSISTENCY — steadiness, not just the average');
const steady = scoring.consistencyScore([60, 60, 60]);
const volatile = scoring.consistencyScore([60, 90, 30]);
const single = scoring.consistencyScore([72]);
console.log(`    steady   60/60/60 -> ${r1(steady.score)}  (mean ${r1(steady.mean)}, volatility ${r1(steady.volatility)})`);
console.log(`    volatile 60/90/30 -> ${r1(volatile.score)}  (mean ${r1(volatile.mean)}, volatility ${r1(volatile.volatility)})`);
console.log(`    one sample only   -> ${r1(single.score)}  (samples ${single.samples})`);
check('the same mean, but erratic, scores lower', volatile.score < steady.score, true);
check('a steady window is its mean', steady.score, 60);
check('a single sample is just that accuracy', single.score, 72);

console.log('\n  BAND CALIBRATION — a fully engaged child, first session, unaided');
const bandAt = (accuracy) => {
  const score = m.calculateMasteryScore({
    knowledgeScore: m.calculateKnowledgeScore(accuracy),
    retentionScore: m.calculateRetentionScore(null, T0, accuracy),
    confidenceScore: conf(accuracy, 4, 0, 0),
    engagementScore: 100,
    consistencyScore: scoring.consistencyScore([accuracy]).score,
  });
  return { score, state: m.determineMasteryState(score) };
};
for (const a of [0, 30, 50, 70, 90, 100]) {
  const b = bandAt(a);
  console.log(`    accuracy ${String(a).padStart(3)} -> ${String(r1(b.score)).padStart(5)}  ${b.state}`);
}
check('participation alone buys 10 points, not 30', r1(bandAt(0).score), 10);
check('scraping 1 star on everything is WEAK', c1.state, 'WEAK');
check('half right is WEAK', bandAt(50).state, 'WEAK');
check('two stars on everything is STRONG', bandAt(70).state, 'STRONG');
check('three stars on everything can reach MASTERED', bandAt(90).state, 'MASTERED');
// `responseTime` is measured and stored but deliberately scores nothing: a span
// across a whole lesson cannot tell hesitation from a child putting the tablet
// down, so penalising it would punish interruptions.
check('a lesson done over a long span is not penalised for it', ev1.responseTime > 0, true);

// ===========================================================================
line('6. CALENDAR-DAY CADENCE — IST, no 24h drift');
// ===========================================================================
console.log(`  offset under test: ${IST} minutes (UTC+${IST / 60})`);
// 18:30 UTC is exactly midnight IST.
const lateEvening = new Date('2026-08-22T18:00:00.000Z'); // 23:30 IST, 22 Aug
const justAfterMidnight = new Date('2026-08-22T19:00:00.000Z'); // 00:30 IST, 23 Aug
check('23:30 and 00:30 IST are different local days', isSameLocalDay(lateEvening, justAfterMidnight, IST), false);
check('...but under UTC they would look like one day', isSameLocalDay(lateEvening, justAfterMidnight, 0), true);
check('day index advances by exactly 1', localDayIndex(justAfterMidnight, IST) - localDayIndex(lateEvening, IST), 1);

const due = addCalendarDays(lateEvening, 1, IST);
check('a 1-day review set at 23:30 IST is due 30 minutes later', isDue(due, justAfterMidnight, IST), true);
check('elapsed wall-clock is under an hour', r1(elapsedDays(lateEvening, justAfterMidnight)) < 0.1, true);
console.log(`  addCalendarDays(23:30 IST, +1) = ${due.toISOString()} (00:00 IST next day)`);

check('calendarDaysBetween is 1', calendarDaysBetween(lateEvening, justAfterMidnight, IST), 1);
check('a 2-day STRONG review is not due tomorrow', isDue(addCalendarDays(lateEvening, 2, IST), justAfterMidnight, IST), false);
for (const [state, days] of Object.entries(engineConfig.unified.review.cadenceDaysByState)) {
  const next = addCalendarDays(T0, days, IST);
  console.log(`  ${state.padEnd(9)} +${days}d -> ${next.toISOString()}  dueToday=${isDue(next, T0, IST)}`);
}

// ===========================================================================
line('7. UNLOCK POLICY — weighted average with a per-prerequisite floor');
// ===========================================================================
const prereq = (id, mastery, completed = true) => ({ skillId: id, mastery, completed });
const titles = { 'a': 'Counting to Five', 'b': 'Letter A', 'c': 'Shapes', 'd': 'Colours' };
const titleOf = (id) => titles[id];

const cases = [
  ['no prerequisites', []],
  ['all four strong', [prereq('a', 90), prereq('b', 88), prereq('c', 85), prereq('d', 92)]],
  ['all four at the threshold', [prereq('a', 70), prereq('b', 70), prereq('c', 70), prereq('d', 70)]],
  ['average just short', [prereq('a', 69), prereq('b', 69), prereq('c', 69), prereq('d', 69)]],
  ['three strong, one badly missed', [prereq('a', 95), prereq('b', 95), prereq('c', 95), prereq('d', 20)]],
  ['strong but one unfinished', [prereq('a', 90), prereq('b', 90, false)]],
];
for (const [name, prereqs] of cases) {
  const d = evaluateUnlock(prereqs);
  console.log(
    `  ${name.padEnd(32)} unlocked=${String(d.unlocked).padEnd(5)} score=${String(r1(d.weightedScore)).padStart(5)} ` +
      `${d.reason.padEnd(31)} "${describeUnlockDecision(d, titleOf)}"`
  );
}
check(
  'the floor stops one 20 being averaged away by three 95s',
  evaluateUnlock([prereq('a', 95), prereq('b', 95), prereq('c', 95), prereq('d', 20)]).unlocked,
  false
);
check(
  'partial credit still works: 70 average opens the gate',
  evaluateUnlock([prereq('a', 55), prereq('b', 85), prereq('c', 85), prereq('d', 55)]).unlocked,
  true
);
check(
  'incompleteness is reported before any score complaint',
  evaluateUnlock([prereq('a', 30, false)]).reason,
  'PREREQUISITE_INCOMPLETE'
);
check(
  'the padlock text names the lesson, not the id',
  describeUnlockDecision(evaluateUnlock([prereq('a', 90, false)]), titleOf),
  'Finish Counting to Five first'
);

// ===========================================================================
line('8. REVIEW CADENCE + LAZY DECAY — the scheduler that does not exist');
// ===========================================================================
console.log(
  '  There is no cron, no worker and no queue runner in this backend, so nothing\n' +
  '  ages a SkillHealth row between one practice session and the next. Decay is\n' +
  '  therefore applied when a row is READ, using the same curve the write path\n' +
  '  uses (mastery-scoring.decayRetention).\n'
);

console.log('  CADENCE — one table, four former copies');
for (const state of ['NEW', 'LEARNING', 'WEAK', 'STRONG', 'MASTERED', 'NEEDS_PRACTICE', 'STABLE', 'REINFORCEMENT']) {
  console.log(`    ${state.padEnd(15)} -> ${cadence.cadenceDaysFor(state)} day(s)`);
}
check('WEAK returns tomorrow', cadence.cadenceDaysFor('WEAK'), 1);
check('STRONG returns in two days', cadence.cadenceDaysFor('STRONG'), 2);
check('MASTERED returns in three', cadence.cadenceDaysFor('MASTERED'), 3);
check('an unknown state falls back rather than throwing', cadence.cadenceDaysFor('SOMETHING_ELSE'), 1);
check(
  "adaptive-planning's own vocabulary is served by the same table",
  cadence.cadenceDaysFor('STABLE'),
  2
);
// The regression this replaces: mastery.constants had strong: 7 and mastered: 30.
check('STRONG is no longer a week away', cadence.cadenceDaysFor('STRONG') < 7, true);
// adaptation.service.ts used to grow frequencyDays by +2 per /analyze call, up to
// a 30-day ceiling, so the interval depended on how often the endpoint was hit.
// Cadence is derived from state now, so no caller can walk a skill out of reach.
check(
  'no state waits longer than three days, so nothing can drift towards a month',
  ['NEW', 'LEARNING', 'WEAK', 'STRONG', 'MASTERED', 'NEEDS_PRACTICE', 'STABLE', 'REINFORCEMENT']
    .every((s) => cadence.cadenceDaysFor(s) <= 3),
  true
);
check(
  'and the cadence for a state is stable under repeated reads',
  cadence.cadenceDaysFor('STRONG') === cadence.cadenceDaysFor('STRONG') &&
    cadence.cadenceDaysFor('STRONG') === 2,
  true
);

console.log('\n  SCHEDULING — a review earned at bedtime waits at breakfast');
const bedtime = new Date('2026-08-22T18:00:00.000Z');       // 23:30 IST
const breakfast = new Date('2026-08-23T01:30:00.000Z');     // 07:00 IST next day
const weak = cadence.nextReviewDateFor('WEAK', bedtime);
const naive = new Date(bedtime.getTime() + 1 * 24 * 60 * 60 * 1000);
console.log(`    calendar-day : ${weak.nextReviewDate.toISOString()}  (00:00 IST, 23 Aug)`);
console.log(`    the old +24h : ${naive.toISOString()}  (23:30 IST, 23 Aug)`);
check('the calendar-day review is waiting at breakfast', cadence.isReviewDue(weak.nextReviewDate, breakfast), true);
// `findDueSkills` filters on `nextReviewDate <= now` in SQL, so the timestamp is
// what decides whether the child sees the review — not a day-index comparison.
// Under the old arithmetic the row simply was not returned yet.
check(
  'the +24h version would not be returned by the queue query yet',
  naive.getTime() <= breakfast.getTime(),
  false
);
check(
  'the calendar-day version is',
  weak.nextReviewDate.getTime() <= breakfast.getTime(),
  true
);
check('the interval is returned with the date, so they cannot drift', weak.frequencyDays, 1);
check('a never-scheduled skill is due immediately', cadence.isReviewDue(null, breakfast), true);
check(
  'a 2-day STRONG review is not due the next morning',
  cadence.isReviewDue(cadence.nextReviewDateFor('STRONG', bedtime).nextReviewDate, breakfast),
  false
);

console.log('\n  LAZY DECAY — what a stored row is worth today');
const health = (masteryScore, retentionScore, lastPracticed) => ({
  masteryScore,
  retentionScore,
  confidenceScore: 80,
  masteryState: m.determineMasteryState(masteryScore),
  lastPracticed,
  decayFactor: null,
});
const daysAgo = (n) => new Date(T0.getTime() - n * 86_400_000);
for (const n of [0, 1, 7, 30, 60, 180]) {
  const p = cadence.projectDecayedHealth(health(86, 100, daysAgo(n)), T0);
  console.log(
    `    stored 86 / retention 100, ${String(n).padStart(3)}d idle -> retention ${String(r1(p.retentionScore)).padStart(5)}` +
    `  mastery ${String(r1(p.masteryScore)).padStart(5)}  ${p.masteryState.padEnd(9)} (lost ${r1(p.masteryLost)})`
  );
}
const fresh = cadence.projectDecayedHealth(health(86, 100, T0), T0);
const stale = cadence.projectDecayedHealth(health(86, 100, daysAgo(60)), T0);
check('practiced today, nothing is taken away', r1(fresh.masteryLost), 0);
check('practiced today, an 86 is still MASTERED', fresh.masteryState, 'MASTERED');
check('two months idle, the same row reads lower', stale.masteryScore < fresh.masteryScore, true);
check('two months idle, it is no longer MASTERED', stale.masteryState, 'STRONG');
check('and so it belongs back in the review queue', cadence.needsReview(health(86, 100, daysAgo(60)), T0), true);
check('whereas today it does not', cadence.needsReview(health(86, 100, T0), T0), false);
check('whole local days are reported, not fractions', stale.daysSincePractice, 60);
// Honest about the size of the effect: this is the number, not a claim.
console.log(
  `\n    decayFactor is ${engineConfig.mastery.retention.decayFactor}/day, so 30 idle days cost about ` +
  `${r1(cadence.projectDecayedHealth(health(86, 100, daysAgo(30)), T0).masteryLost)} mastery points.\n` +
  '    Decay is a nudge; CADENCE is what actually brings a topic back. Both are\n' +
  '    needed — decay alone would take months to matter.'
);
check(
  'a month of decay is a nudge, not a demotion (documented, not a bug)',
  cadence.projectDecayedHealth(health(86, 100, daysAgo(30)), T0).masteryLost < 5,
  true
);
check(
  'the decayed score is re-banded, not left claiming its old band',
  cadence.projectDecayedHealth(health(62, 100, daysAgo(180)), T0).masteryState,
  'WEAK');

// -------------------------------------------------------------------------
// Until this stage, which curve a row decayed on depended on which code path
// created it: 0.995 from the engine, 0.9 from placement, 0.5 from the
// skill-health repository default, and [0.7, 0.95] once adaptation had touched
// it. All five writers now store the one constant. The numbers below are why
// that mattered — same stored row, three provenances, three different children.
console.log('\n  DECAY PROVENANCE — the same row, whichever writer created it');
for (const [label, factor] of [['engine 0.995', 0.995], ['placement 0.9', 0.9], ['repo default 0.5', 0.5]]) {
  const p = cadence.projectDecayedHealth(
    { ...health(86, 100, daysAgo(30)), decayFactor: factor }, T0
  );
  console.log(`    ${label.padEnd(17)} 30d idle -> retention ${String(r1(p.retentionScore)).padStart(5)}  mastery ${String(r1(p.masteryScore)).padStart(5)}  ${p.masteryState}`);
}
check(
  'the old placement factor was a different curve, not a rounding difference',
  r1(cadence.projectDecayedHealth({ ...health(86, 100, daysAgo(30)), decayFactor: 0.9 }, T0).retentionScore) < 10,
  true
);
check(
  'a row with no stored factor falls back to the shared constant',
  cadence.projectDecayedHealth(health(86, 100, daysAgo(30)), T0).retentionScore,
  cadence.projectDecayedHealth(
    { ...health(86, 100, daysAgo(30)), decayFactor: engineConfig.mastery.retention.decayFactor }, T0
  ).retentionScore
);

console.log('\n  PRIORITY — why a skill is queued now changes where it sits');
const pri = (mastery, cause) =>
  cadence.reviewPriority({ masteryScore: mastery, retentionScore: mastery, confidenceScore: mastery, cause });
for (const cause of ['SCHEDULED', 'MASTERY_GAP', 'PREREQUISITE_GAP', 'RETENTION_DROP', 'REGRESSION']) {
  console.log(`    mastery 45, ${cause.padEnd(16)} -> priority ${String(pri(45, cause)).padStart(3)}   "${cadence.describeReviewCause(cause, 'Counting to Five')}"`);
}
check('a regression outranks an ordinary gap', pri(45, 'REGRESSION') > pri(45, 'MASTERY_GAP'), true);
check('a fading skill outranks an ordinary gap', pri(45, 'RETENTION_DROP') > pri(45, 'MASTERY_GAP'), true);
check('a regression outranks a fading skill', pri(45, 'REGRESSION') > pri(45, 'RETENTION_DROP'), true);
check('a weaker skill still outranks a stronger one', pri(20, 'MASTERY_GAP') > pri(70, 'MASTERY_GAP'), true);
// priorityClampMax sat in config with no reader until Stage 4.
check(
  'priority is bounded by priorityClampMax, however many boosts apply',
  pri(0, 'REGRESSION'),
  engineConfig.reinforcement.priorityClampMax
);
check('the reason names the skill a parent recognises',
  cadence.describeReviewCause('REGRESSION', 'Counting to Five').includes('Counting to Five'), true);
check('every cause reads differently',
  new Set(['SCHEDULED', 'MASTERY_GAP', 'PREREQUISITE_GAP', 'RETENTION_DROP', 'REGRESSION'].map((c) => cadence.describeReviewCause(c))).size,
  5
);

// -------------------------------------------------------------------------
// Placement writes into the same queue, read with the same `ORDER BY priority
// DESC`, so its rows have to be scored on this scale or they are invisible.
// It used to hand-assign 5 for a prerequisite gap and 3 for a weak skill.
// These are the exact numbers placement.service.ts now writes.
console.log('\n  PLACEMENT ROWS — the same queue, so the same scale');
const placementGap = cadence.reviewPriority({
  masteryScore: 0, retentionScore: 30, confidenceScore: 30, cause: 'PREREQUISITE_GAP',
});
const placementWeak = cadence.reviewPriority({
  masteryScore: 35, retentionScore: 30, confidenceScore: 30, cause: 'MASTERY_GAP',
});
const engineWeak = cadence.reviewPriority({
  masteryScore: 45, retentionScore: 45, confidenceScore: 45, cause: 'MASTERY_GAP',
});
console.log(`    prerequisite gap ${placementGap}, weak-at-placement ${placementWeak}, engine-detected weak ${engineWeak}`);
check('a prerequisite gap still outranks a weak skill, as 5 > 3 intended',
  placementGap > placementWeak, true);
check('placement rows are now comparable with engine rows rather than sorting below all of them',
  placementGap > engineWeak && placementWeak > engineWeak * 0.5, true);
check('and both are far above the old hand-assigned 5', placementWeak > 5, true);

console.log('\n  BANDS — one predicate, two callers');
check(
  'masteryStateFor and determineMasteryState agree across the range',
  [0, 39, 40, 59, 60, 84, 85, 100].every((s) => scoring.masteryStateFor(s) === m.determineMasteryState(s)),
  true
);

// ===========================================================================
line('9. THE ROADMAP PROJECTION — how much of the backlog the child meets today');
// ===========================================================================
console.log(
  '  The engine had been writing ReinforcementQueue for a while and GET /roadmap —\n' +
  '  the only roadmap endpoint the app calls — never read it. planReviews is the\n' +
  '  missing decision, and it is pure so it can be checked here rather than only\n' +
  '  against a database.\n'
);

const RM = engineConfig.unified.roadmap;
const day = 86_400_000;
/** One `ReinforcementQueue` row, as `findDueSkills` would return it. */
const dueRow = (skillId, priority, dueDaysAgo = 1) => ({
  skillId,
  priority,
  reason: `Let's practice ${skillId} again.`,
  nextReviewDate: new Date(T0.getTime() - dueDaysAgo * day),
  masteryState: 'WEAK',
});
const ids = (plan) => plan.surfaced.map((s) => s.skillId).join(',');
/** Everything named is a completed lesson in this grade. */
const reviewable = (...names) => new Set(names);

console.log('  REACHABILITY — a queue row is only a skill id');
const mixed = planReviews({
  due: [dueRow('done_a', 90), dueRow('never_opened', 110), dueRow('other_grade', 100)],
  reviewableIds: reviewable('done_a'),
  reviewsDoneToday: 0,
});
check('a skill the child never opened is not offered', ids(mixed), 'done_a');
check('and the unoffered rows are reported, not silently dropped', mixed.unreachableCount, 2);
check('dueCount is the reachable backlog, not the raw queue length', mixed.dueCount, 1);
// Placement writes a dated SkillHealth row for every LOCKED skill in the system,
// so without this filter the very first roadmap read would offer a review of a
// lesson the child has never seen.
check(
  'nothing reachable means nothing surfaced, however urgent the queue looks',
  planReviews({
    due: [dueRow('never_opened', 120)],
    reviewableIds: reviewable(),
    reviewsDoneToday: 0,
  }).surfaced.length,
  0
);

console.log("\n  ORDER — the engine ranked it; the roadmap does not re-rank it");
const ranked = planReviews({
  due: [dueRow('low', 30), dueRow('high', 95), dueRow('mid', 60)],
  reviewableIds: reviewable('low', 'mid', 'high'),
  reviewsDoneToday: 0,
});
check('highest priority first', ranked.surfaced[0].skillId, 'high');
check('the queue row’s own priority survives the trip', ranked.surfaced[0].priority, 95);
check('the queue row’s own sentence survives the trip',
  ranked.surfaced[0].reason.includes('high'), true);
// Equal priority: the older debt goes first, then the id. Without the id
// tie-break, two equally urgent skills could swap places between two reads of
// unchanged data and the child would watch the path reshuffle on every refresh.
const tiedInput = [dueRow('b_skill', 70, 1), dueRow('a_skill', 70, 1), dueRow('waited', 70, 9)];
const tied = planReviews({
  due: tiedInput,
  reviewableIds: reviewable('a_skill', 'b_skill', 'waited'),
  reviewsDoneToday: 0,
});
check('among equals, the longest wait comes first', tied.surfaced[0].skillId, 'waited');
const shuffled = planReviews({
  due: [...tiedInput].reverse(),
  reviewableIds: reviewable('a_skill', 'b_skill', 'waited'),
  reviewsDoneToday: 0,
});
check('the order does not depend on the order rows arrived in', ids(shuffled), ids(tied));
check(
  'a malformed date sorts rather than throwing',
  planReviews({
    due: [{ skillId: 'bad', priority: 70, reason: 'x', nextReviewDate: 'not-a-date' }],
    reviewableIds: reviewable('bad'),
    reviewsDoneToday: 0,
  }).surfaced.length,
  1
);

console.log('\n  CAPS — a bad week must not become a wall');
const backlog = ['s1', 's2', 's3', 's4', 's5'];
const capped = planReviews({
  due: backlog.map((id, i) => dueRow(id, 100 - i)),
  reviewableIds: reviewable(...backlog),
  reviewsDoneToday: 0,
});
check('five skills due, and the child is shown maxReviewsAhead', capped.surfaced.length, RM.maxReviewsAhead);
check('the rest are deferred, not lost', capped.deferredCount, backlog.length - RM.maxReviewsAhead);
check('and they are the most urgent ones', ids(capped), 's1,s2');

const nearlyDone = planReviews({
  due: backlog.map((id, i) => dueRow(id, 100 - i)),
  reviewableIds: reviewable(...backlog),
  reviewsDoneToday: RM.maxReviewsPerDay - 1,
});
check('the daily ceiling counts what is already done, not what is asked for',
  nearlyDone.dailyAllowance, 1);
check('so the last slot of the day holds one review', nearlyDone.surfaced.length, 1);

const spentDay = planReviews({
  due: backlog.map((id, i) => dueRow(id, 100 - i)),
  reviewableIds: reviewable(...backlog),
  reviewsDoneToday: RM.maxReviewsPerDay + 4,
});
check('a day already over its quota surfaces nothing', spentDay.surfaced.length, 0);
check('the allowance floors at zero rather than going negative', spentDay.dailyAllowance, 0);
check('and the backlog is still reported honestly', spentDay.dueCount, backlog.length);

console.log('\n  THE GATE — soft by default, and the flip is one flag');
const soft = planReviews({
  due: [dueRow('done_a', 90)],
  reviewableIds: reviewable('done_a'),
  reviewsDoneToday: 0,
});
check('shipped default is soft', RM.gateMode, 'soft');
check('so a due review never blocks the next lesson', soft.blocksNextLesson, false);
check('but it is still surfaced ahead of it', soft.surfaced.length, 1);

// Config is a plain object at runtime; `as const` only makes it readonly to the
// compiler. Flipping it here is the only way to exercise the branch that
// `lesson-access.service.ts` enforces, and it is restored immediately.
const shippedMode = RM.gateMode;
try {
  engineConfig.unified.roadmap.gateMode = 'hard';
  const hard = planReviews({
    due: [dueRow('done_a', 90)],
    reviewableIds: reviewable('done_a'),
    reviewsDoneToday: 0,
  });
  check('under hard mode the same review blocks', hard.blocksNextLesson, true);
  // The distinction that matters: a hard gate with an empty day must not lock a
  // child out of the curriculum.
  const hardIdle = planReviews({
    due: [],
    reviewableIds: reviewable('done_a'),
    reviewsDoneToday: 0,
  });
  check('with nothing due, a hard gate blocks nothing', hardIdle.blocksNextLesson, false);
  const hardSpent = planReviews({
    due: [dueRow('done_a', 90)],
    reviewableIds: reviewable('done_a'),
    reviewsDoneToday: RM.maxReviewsPerDay,
  });
  check('and once the day’s reviews are done it stops blocking', hardSpent.blocksNextLesson, false);
  const hardUnreachable = planReviews({
    due: [dueRow('never_opened', 120)],
    reviewableIds: reviewable('done_a'),
    reviewsDoneToday: 0,
  });
  check('a queue full of unreachable rows cannot wall the child in',
    hardUnreachable.blocksNextLesson, false);
} finally {
  engineConfig.unified.roadmap.gateMode = shippedMode;
}
check('the harness left the shipped mode alone', engineConfig.unified.roadmap.gateMode, 'soft');

console.log('\n  ONCE A DAY — falls out of calendar-day scheduling, not extra bookkeeping');
// A skill practiced now is rescheduled to the START of a later local day, so it
// cannot come due again in the session that just finished it.
const practicedNow = cadence.nextReviewDateFor('WEAK', T0).nextReviewDate;
check('a skill just practiced is not due again today',
  isDue(practicedNow, T0, IST), false);
check(
  'and findDueSkills would not return it either, since the stored date is in the future',
  practicedNow.getTime() > T0.getTime(),
  true
);

// ===========================================================================
line('10. MODALITY PROFILE — the first thing that knows what a child finds hard');
// ===========================================================================
console.log(
  '  `ModalityPerformance` and `LearningProfile` were read by four services and\n' +
  '  written by none on any path the app can reach, so `selectActivityType` fell\n' +
  '  through to its fallback every time: every review ever offered to every child\n' +
  '  was a video. And no aggregation anywhere computed a *weakest* modality — they\n' +
  '  all maximise — so a review had nothing remedial to aim at.\n' +
  '\n' +
  '  Both halves are checked here. The formula is pure, and the two honesty rules\n' +
  '  that keep "weakest" from being a guess are the whole point of the module.\n'
);

const AT = ActivityType;
/** One `ModalityPerformance` row. */
const obs = (activityType, attempts, averageAccuracy, averageEngagement, averageConfidence) => ({
  activityType,
  attempts,
  averageAccuracy,
  averageEngagement,
  averageConfidence,
});
const order = (profile) => profile.ranked.map((r) => r.activityType).join(',');

console.log('  THE FORMULA — one reader for weights that had none');
const W = engineConfig.adaptive.modalityScoreWeights;
console.log(`    weights: accuracy ${W.accuracy}, engagement ${W.engagement}, confidence ${W.confidence}`);
console.log(`    acc 90 / eng 100 / conf 50 -> ${modalityScore(obs(AT.VIDEO, 4, 90, 100, 50))}`);
console.log(`    acc 100 alone              -> ${modalityScore(obs(AT.VIDEO, 4, 100, 0, 0))}`);
console.log(`    eng 100 alone              -> ${modalityScore(obs(AT.VIDEO, 4, 0, 100, 0))}`);
console.log(`    conf 100 alone             -> ${modalityScore(obs(AT.VIDEO, 4, 0, 0, 100))}`);
check('the blend is the config weights', modalityScore(obs(AT.VIDEO, 4, 90, 100, 50)), 86);
check(
  'accuracy and engagement count equally',
  modalityScore(obs(AT.VIDEO, 4, 100, 0, 0)),
  modalityScore(obs(AT.VIDEO, 4, 0, 100, 0))
);
check(
  'confidence, the least modality-specific of the three, counts least',
  modalityScore(obs(AT.VIDEO, 4, 0, 0, 100)) < modalityScore(obs(AT.VIDEO, 4, 100, 0, 0)),
  true
);
// The defect in `adaptation.determinePreferredModality`: it substituted
// min(attempts, 20) for the confidence term, so a much-practiced modality looked
// preferred merely because it was much practiced.
check(
  'practice volume is not a score — 1 attempt and 99 blend identically',
  modalityScore(obs(AT.VIDEO, 1, 80, 80, 80)),
  modalityScore(obs(AT.VIDEO, 99, 80, 80, 80))
);
check(
  'a garbage average cannot push the score off the 0-100 scale',
  modalityScore(obs(AT.VIDEO, 4, 500, Number.NaN, -20)),
  40
);

console.log('\n  RULE 1: EVIDENCE — a modality never met is unmeasured, not weak');
const oneAnecdote = profileModalities([
  obs(AT.VIDEO, 6, 90, 100, 80),
  obs(AT.WRITING, 1, 10, 10, 10),
]);
console.log(
  `    video x6 (90) + writing x1 (10) -> preferred ${oneAnecdote.preferred}  ` +
    `weakest ${oneAnecdote.weakest}  withheld ${oneAnecdote.weakestWithheld}`
);
check('a single observation names no weakness', oneAnecdote.weakest, null);
check('and says so', oneAnecdote.weakestWithheld, 'insufficient-evidence');
check('the unevidenced row is still ranked, just flagged', oneAnecdote.ranked.length, 2);
check('one evidenced row is enough to name a preference', oneAnecdote.preferred, AT.VIDEO);
check('evidencedCount reports the truth', oneAnecdote.evidencedCount, 1);
// The failure mode this prevents, stated as a test: the worst *number* belongs to
// a modality with one observation, and it must not become the thing the child is
// sent to practice.
const anecdoteBeatsEvidence = profileModalities([
  obs(AT.VIDEO, 6, 92, 100, 80),
  obs(AT.SPEAKING, 5, 55, 60, 60),
  obs(AT.WRITING, 1, 5, 5, 5),
]);
check(
  'the lowest score does not win when it is the least measured',
  anecdoteBeatsEvidence.weakest,
  AT.SPEAKING
);
check('nothing measured at all falls back to config', profileModalities([]).preferred, engineConfig.adaptive.defaultPreferredModality);
check('and withholds a weakest rather than inventing one', profileModalities([]).weakest, null);
check('an empty profile has an empty ranking', profileModalities([]).ranked.length, 0);

console.log('\n  RULE 2: SEPARATION — being last out of four is not being weak');
const noise = profileModalities([
  obs(AT.VIDEO, 4, 80, 80, 80),
  obs(AT.LISTENING, 4, 79, 78, 80),
  obs(AT.SPEAKING, 4, 78, 78, 78),
  obs(AT.WRITING, 4, 78, 77, 78),
]);
console.log(
  `    four modalities within a couple of points -> spread ${noise.spread}  ` +
    `weakest ${noise.weakest}  withheld ${noise.weakestWithheld}`
);
check('inside the margin there is no weakest', noise.weakest, null);
check('and the reason is distinguishable from missing evidence', noise.weakestWithheld, 'within-noise');
check('the spread is reported either way, so a caller can see how close it was',
  noise.spread < engineConfig.adaptive.weakestModalitySeparationPoints, true);

const realGap = profileModalities([
  obs(AT.VIDEO, 6, 92, 100, 80),
  obs(AT.LISTENING, 5, 85, 90, 80),
  obs(AT.SPEAKING, 4, 48, 60, 55),
  obs(AT.WRITING, 3, 70, 80, 70),
]);
console.log(`    a real gap -> preferred ${realGap.preferred}  weakest ${realGap.weakest}  spread ${realGap.spread}`);
check('a genuine gap is named', realGap.weakest, AT.SPEAKING);
check('withheld is "none" when a weakest was named', realGap.weakestWithheld, 'none');
check('preferred is the best evidenced row', realGap.preferred, AT.VIDEO);
check('spread is best minus worst', realGap.spread, r1(realGap.ranked[0].score - realGap.ranked[3].score));
// This is the assertion that makes reviews remedial rather than flattering: the
// modality a review targets is NOT the one the child is best at.
check('the review target is the hard thing, not the strong one', realGap.weakest !== realGap.preferred, true);

console.log('\n  ORDERING — stable, or the child watches their weakness change on refresh');
const tiedRows = [
  obs(AT.VIDEO, 4, 80, 80, 80),
  obs(AT.WRITING, 4, 80, 80, 80),
  obs(AT.LISTENING, 4, 80, 80, 80),
  obs(AT.CREATIVE, 4, 80, 80, 80),
];
const tiedProfile = profileModalities(tiedRows);
const tiedReversed = profileModalities([...tiedRows].reverse());
console.log(`    four identical scores -> ${order(tiedProfile)}`);
check('the order does not depend on the order rows arrived in', order(tiedReversed), order(tiedProfile));
// Rotation order first (VIDEO 0, WRITING 4), then the name for the two the
// rotation table does not contain at all — LISTENING is genuinely absent from it.
check('ties break on rotation order, then on name', order(tiedProfile), [AT.VIDEO, AT.WRITING, AT.CREATIVE, AT.LISTENING].join(','));
check(
  'more evidence outranks less at an equal score',
  profileModalities([obs(AT.WRITING, 9, 80, 80, 80), obs(AT.VIDEO, 2, 80, 80, 80)]).preferred,
  AT.WRITING
);
check(
  'and four identical rows are within noise, so no weakest',
  tiedProfile.weakest,
  null
);

console.log('\n  FOLDING — one session into a running average');
console.log(`    from nothing, a 40      -> ${JSON.stringify(foldObservation(null, { accuracy: 40, engagement: 100, confidence: 60 }))}`);
let folded = null;
for (let i = 0; i < 6; i++) {
  const next = foldObservation(folded, { accuracy: 80, engagement: 90, confidence: 70 });
  folded = { activityType: AT.SPEAKING, ...next };
  console.log(`    session ${i + 1}: attempts ${next.attempts}  accuracy ${next.averageAccuracy}`);
}
check('the first fold is the sample itself', foldObservation(null, { accuracy: 40, engagement: 100, confidence: 60 }).averageAccuracy, 40);
check('the first fold counts as one observation', foldObservation(null, { accuracy: 40, engagement: 100, confidence: 60 }).attempts, 1);
check('six identical sessions converge on the sample', folded.averageAccuracy, 80);
check('and are counted, since attempts is the weight the average was built with', folded.attempts, 6);
check(
  'a second session moves a stored average halfway',
  foldObservation(obs(AT.SPEAKING, 1, 40, 40, 40), { accuracy: 80, engagement: 80, confidence: 80 }).averageAccuracy,
  60
);
check(
  'a stored row claiming zero observations is treated as new rather than dividing by it',
  foldObservation(obs(AT.SPEAKING, 0, 999, 999, 999), { accuracy: 70, engagement: 70, confidence: 70 }).averageAccuracy,
  70
);
check(
  'an out-of-range sample is clamped before it is stored',
  foldObservation(null, { accuracy: 150, engagement: -5, confidence: Number.NaN }),
  (v) => v.averageAccuracy === 100 && v.averageEngagement === 0 && v.averageConfidence === 0
);
// The round trip that matters: fold real per-modality samples in, and the profile
// that comes out is the one `selectActivityType` will act on.
const afterThreeLessons = profileModalities([
  obs(AT.VIDEO, 3, 90, 100, 75),
  obs(AT.SPEAKING, 3, 50, 62, 75),
]);
check(
  'three lessons of evidence is enough to aim a review',
  afterThreeLessons.weakest,
  AT.SPEAKING
);
check(
  'and the review would no longer be a video',
  afterThreeLessons.weakest !== engineConfig.reinforcement.defaultFallbackModality,
  true
);

// ===========================================================================
// mastery.view.ts — the one shape four screens read
// ===========================================================================
line('MASTERY VIEW — the projection the app is actually given');
console.log(`
  Four screens each read /mastery/child/:childId and each was wrong about the
  result in a different way, because the endpoint returned a raw Prisma
  SkillHealth row: SkillMasteryScreen called .skills.map() on a flat row (a
  crash that only stayed hidden while the table was empty), MasteryScreen
  compared masteryState against three lowercase words the enum does not
  contain, AITutorHomeScreen rendered skillName/domain/gap/priority — none of
  which exist on a health row — and every client was handed decayFactor and
  friends it had no business reading.

  This section is the contract. If it passes, all four consumers can be typed
  from one declaration.`);

const skillRel = {
  name: 'Big and Small',
  masteryThreshold: 80,
  domain: { name: 'Comparison' },
  subject: { name: 'Maths' },
};

const viewRow = (o = {}) => ({
  skillId: o.skillId ?? 'skill-a',
  // Stored band. Deliberately set to a lie in one case below: the view must
  // band today's decayed score, not repeat what was written last month.
  masteryState: o.masteryState ?? 'STRONG',
  masteryScore: o.masteryScore ?? 86,
  confidenceScore: o.confidenceScore ?? 70,
  retentionScore: o.retentionScore ?? 90,
  lastPracticed: o.lastPracticed ?? T0,
  nextReviewDate: o.nextReviewDate ?? null,
  reviewCount: o.reviewCount ?? null,
  attemptCount: o.attemptCount ?? null,
  decayFactor: o.decayFactor ?? null,
  skill: o.skill === undefined ? skillRel : o.skill,
});
const daysAfterT0 = (n) => new Date(T0.getTime() + n * 86_400_000);

console.log('\n  NAMING — a UUID is not a skill name');
const unjoined = toSkillMasteryView(viewRow({ skill: null }), T0);
console.log(`    row with no skill relation -> "${unjoined.skillName}" / "${unjoined.domain}"`);
check('an un-joined row says so rather than printing the id', unjoined.skillName, 'Untitled skill');
check('and never leaks the id into a name a parent reads', unjoined.skillName.includes('skill-a'), false);
check('domain falls back to General', unjoined.domain, 'General');
check(
  'a skill with a subject but no domain borrows the subject',
  toSkillMasteryView(viewRow({ skill: { name: 'Rhyming', subject: { name: 'English' } } }), T0).domain,
  'English'
);
check(
  'a padded name is trimmed, not rendered with its whitespace',
  toSkillMasteryView(viewRow({ skill: { name: '  Sorting  ' } }), T0).skillName,
  'Sorting'
);
check(
  'the four fields the weak-skill cards render are all present',
  ['skillName', 'domain', 'gap', 'priority'].every((k) => k in unjoined),
  true
);

console.log("\n  TODAY'S SCORE — stored is a memory, decayed is the answer");
const workedToday = toSkillMasteryView(viewRow(), T0);
const idle = toSkillMasteryView(viewRow(), daysAfterT0(21));
console.log(`    practiced today     -> score ${workedToday.masteryScore}  stored ${workedToday.storedScore}  slipping ${workedToday.isSlipping}  gap ${workedToday.gap}  ${workedToday.masteryState}`);
console.log(`    idle for 21 days    -> score ${idle.masteryScore}  stored ${idle.storedScore}  slipping ${idle.isSlipping}  gap ${idle.gap}  ${idle.masteryState}`);
check('a skill practiced today reports its stored score', workedToday.masteryScore, workedToday.storedScore);
check('and is not described as slipping', workedToday.isSlipping, false);
check('nor is it "N days ago" on the day it happened', workedToday.daysSincePractice, 0);
check('a score at or above threshold has no gap left', workedToday.gap, 0);
check('three idle weeks cost the skill something', idle.masteryScore < idle.storedScore, true);
check('the stored figure survives beside it, so a screen can say "was 86"', idle.storedScore, 86);
check('and the row admits it is slipping', idle.isSlipping, true);
check('days are whole local sleeps, not fractions', idle.daysSincePractice, 21);
/*
 * Decay is a slope, not a cliff. Three idle weeks cost this skill a couple of
 * points and it is still clear of the 80 it needs — which is the behaviour we
 * want, and the opposite of what I first asserted here ("the gap reopens once
 * the decayed score falls below threshold", checked against a row that had not
 * fallen below it). The gap reopening is a real property, so it gets a row built
 * to show it: one that only just cleared the bar in the first place.
 */
check('three idle weeks do not by themselves undo a comfortable pass', idle.gap, 0);
const barelyPassed = toSkillMasteryView(viewRow({ masteryScore: 81 }), daysAfterT0(21));
console.log(`    passed at 81, 21 days idle -> score ${barelyPassed.masteryScore}  gap ${barelyPassed.gap}  ${barelyPassed.masteryState}`);
check('but a skill that only just cleared it falls back under', barelyPassed.gap > 0, true);
check(
  'gap is measured against the skill’s own threshold, not a global one',
  toSkillMasteryView(viewRow({ masteryScore: 40, skill: { name: 'X', masteryThreshold: 60 } }), T0).gap,
  20
);
check(
  'a row missing its skill relation still bands against the schema default of 80',
  toSkillMasteryView(viewRow({ masteryScore: 70, skill: null }), T0).gap,
  10
);
check(
  'one decimal place, so no screen prints 79.30000000000001',
  Number.isInteger(idle.masteryScore * 10),
  true
);

console.log('\n  THE BAND IS TODAY’S, NOT LAST MONTH’S');
const staleClaim = toSkillMasteryView(
  viewRow({ masteryScore: 86, masteryState: 'MASTERED', retentionScore: 95 }),
  daysAfterT0(60)
);
console.log(`    stored MASTERED, 60 days idle -> ${staleClaim.masteryState} at ${staleClaim.masteryScore}  priority ${staleClaim.priority}`);
check('a stored MASTERED does not survive two months of neglect', staleClaim.masteryState === 'MASTERED', false);
check('the decayed band is the one the cards are banded from', staleClaim.priority, 'medium');
check(
  'and read on the day it was written the same row is not urgent at all',
  toSkillMasteryView(viewRow({ masteryScore: 86, masteryState: 'MASTERED', retentionScore: 95 }), T0).priority,
  'low'
);
check('a skill worked today is not urgent', workedToday.priority, 'low');
check(
  'decay raises queue priority rather than leaving it frozen at the stored score',
  idle.priorityScore > workedToday.priorityScore,
  true
);

/*
 * THE BAND ORDER IS NOT THE ENUM ORDER — the defect this section was written to
 * catch, and did.
 *
 * `masteryStateFor` bands against `stateThresholds = {learning: 40, weak: 60,
 * strong: 85}`: below 40 is LEARNING, 40-59 is WEAK. So LEARNING is the *bottom*
 * band and WEAK sits above it, which is the reverse of what the enum's
 * declaration order suggests. `priorityBandFor` originally read WEAK as 'high'
 * and LEARNING as 'medium' — so a child scoring 30 on a skill was told it wanted
 * less attention than one scoring 50, and the parent screen's "Skills Needing
 * Attention" card, filtering on WEAK, left out every skill below 40 entirely.
 *
 * The fix was to stop hand-writing the mapping and derive it from
 * `cadenceDaysByState`, which already ranks the bands correctly. These checks
 * pin down both halves: the two boundary scores, and the monotonicity that any
 * future hand-written table would break.
 */
console.log('\n  BAND ORDER — LEARNING is the floor, not the middle');
console.log(`    30 -> ${scoring.masteryStateFor(30)}   50 -> ${scoring.masteryStateFor(50)}   70 -> ${scoring.masteryStateFor(70)}   90 -> ${scoring.masteryStateFor(90)}`);
check('a score of 30 bands below a score of 50', scoring.masteryStateFor(30), 'LEARNING');
check('and 50 is the one called WEAK', scoring.masteryStateFor(50), 'WEAK');
check(
  'the worse of the two is not the calmer of the two',
  toSkillMasteryView(viewRow({ masteryScore: 30, retentionScore: 30 }), T0).priority,
  'high'
);
check(
  'and the band above it is equally urgent, because the engine wants both tomorrow',
  toSkillMasteryView(viewRow({ masteryScore: 50, retentionScore: 50 }), T0).priority,
  'high'
);
const urgency = { high: 2, medium: 1, low: 0 };
const sweep = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95].map((s) => ({
  score: s,
  band: toSkillMasteryView(viewRow({ masteryScore: s, retentionScore: s }), T0).priority,
}));
console.log(`    ${sweep.map((p) => `${p.score}:${p.band}`).join('  ')}`);
check(
  'urgency never rises as the score does',
  sweep.every((p, i) => i === 0 || urgency[sweep[i - 1].band] >= urgency[p.band]),
  true
);
check('the floor of the sweep is urgent', sweep[0].band, 'high');
check('the top of it is not', sweep[sweep.length - 1].band, 'low');
check(
  'priority tracks the cadence table rather than a second scale invented for the cards',
  sweep.every((p) => {
    const days = cadence.cadenceDaysFor(scoring.masteryStateFor(p.score));
    return p.band === (days <= 1 ? 'high' : days <= 2 ? 'medium' : 'low');
  }),
  true
);
check(
  'priorityScore is the engine’s own, so a list orders by it instead of re-ranking',
  toSkillMasteryView(viewRow({ masteryScore: 30, retentionScore: 30, confidenceScore: 30 }), T0).priorityScore,
  cadence.reviewPriority({ masteryScore: 30, retentionScore: 30, confidenceScore: 30 })
);

console.log('\n  WHAT IS NOT IN IT — engine internals stay server-side');
const keys = Object.keys(workedToday).sort();
console.log(`    keys -> ${keys.join(', ')}`);
for (const leak of ['decayFactor', 'frequencyDays', 'retryCount', 'childId']) {
  check(`${leak} is not shipped to the client`, keys.includes(leak), false);
}
check('lastAssessed is an ISO string, not a Date the JSON layer guesses at', typeof workedToday.lastAssessed, 'string');
check('a never-scheduled review is null rather than an epoch date', workedToday.nextReviewAt, null);
check('and a never-scheduled skill is due as soon as anyone asks', workedToday.isDue, true);
check(
  'a review set for tomorrow is not due today',
  toSkillMasteryView(viewRow({ nextReviewDate: daysAfterT0(1) }), T0).isDue,
  false
);
check(
  'a review set for yesterday is',
  toSkillMasteryView(viewRow({ nextReviewDate: daysAfterT0(-1) }), T0).isDue,
  true
);
check(
  'an unparseable stored date is reported as absent, not as NaN',
  toSkillMasteryView(viewRow({ nextReviewDate: 'not a date' }), T0).nextReviewAt,
  null
);
check('a null count is 0, so no screen renders "null reviews"', workedToday.reviewCount, 0);

console.log('\n  ORDERING — worst first, and the same worst on every screen');
const rows = [
  viewRow({ skillId: 'strong', masteryScore: 92, retentionScore: 95, confidenceScore: 90, skill: { name: 'Counting to Ten' } }),
  viewRow({ skillId: 'weak', masteryScore: 31, retentionScore: 30, confidenceScore: 35, skill: { name: 'Letter Sounds' } }),
  viewRow({ skillId: 'middling', masteryScore: 64, retentionScore: 60, confidenceScore: 60, skill: { name: 'Shapes' } }),
];
const ordered = toSkillMasteryViews(rows, T0);
console.log(`    -> ${ordered.map((v) => `${v.skillName} (${v.masteryScore}, p${v.priorityScore})`).join('  |  ')}`);
check('the skill needing most help is first', ordered[0].skillId, 'weak');
check('the healthiest is last', ordered[2].skillId, 'strong');
check('priority descends monotonically', ordered.every((v, i) => i === 0 || ordered[i - 1].priorityScore >= v.priorityScore), true);
const reversed = toSkillMasteryViews([...rows].reverse(), T0).map((v) => v.skillId).join(',');
check('and the order does not depend on the order the rows arrived in', reversed, ordered.map((v) => v.skillId).join(','));
const tiedViews = toSkillMasteryViews(
  [
    viewRow({ skillId: 'b', masteryScore: 50, retentionScore: 50, confidenceScore: 50, skill: { name: 'Bravo' } }),
    viewRow({ skillId: 'a', masteryScore: 50, retentionScore: 50, confidenceScore: 50, skill: { name: 'Alpha' } }),
  ],
  T0
);
check('an exact tie breaks on name, so the order is total', tiedViews.map((v) => v.skillName).join(','), 'Alpha,Bravo');
check('an empty list projects to an empty list', toSkillMasteryViews([], T0).length, 0);


// ===========================================================================
line('11. THE PRACTICE SESSION — the day’s reviews as one stop on the path');
// ===========================================================================
console.log(
  '  planReviews decides which skills come back. This decides how the roadmap\n' +
  '  announces them: one stop in front of the day’s new lesson, instead of purple\n' +
  '  recolouring of lessons finished weeks ago and buried up the path. It is a\n' +
  '  description, never a node — `nodes[]` stays pure curriculum, because eleven\n' +
  '  places count that array and a synthetic entry would drop the journey’s\n' +
  '  completion percentage the moment a skill went stale.\n'
);

/** One surfaced review, resolved to the lesson it is practiced through. */
const pItem = (lessonId, title = `Lesson ${lessonId}`) => ({ lessonId, title });
/** The day's new lesson: unfinished, so the stop has something to sit in front of. */
const NEXT_LESSON = { id: 'lesson_next', themeId: 'theme_2', isCompleted: false };
const practice = (over = {}) =>
  describePracticeSession({
    surfaced: [],
    reviewsDoneToday: 0,
    nextLesson: NEXT_LESSON,
    isBlocking: false,
    now: T0,
    ...over,
  });

console.log('  EXISTENCE — a stop appears, and does not vanish the moment it is done');
check('a child with nothing due and nothing practiced gets no stop at all',
  practice(), null);
check('one skill due puts a stop on the path',
  practice({ surfaced: [pItem('a')] }) !== null, true);
check('and it is not ticked while there is still something to do',
  practice({ surfaced: [pItem('a')] }).isCompleted, false);
// The alternative — dropping the stop the instant the last review is finished —
// reads as a bug and denies the child the tick, which is the only thing that
// makes revision bearable.
const donePractice = practice({ reviewsDoneToday: 2 });
check('the day’s reviews finished leaves the stop in place, ticked',
  donePractice.isCompleted, true);
check('a ticked stop offers nothing further to open', donePractice.lessonIds.length, 0);
check('and it still says what was done', donePractice.subtitle, '2 skills practiced today');
check('one review reads as one', practice({ reviewsDoneToday: 1 }).subtitle,
  '1 skill practiced today');
check('the title is the words the child was promised', practice({ reviewsDoneToday: 1 }).title,
  'Practice session');

console.log('\n  PLACEMENT — before the new topic of that day, not after it');
const placed = practice({ surfaced: [pItem('a'), pItem('b')] });
check('the stop is spliced in front of the next new lesson', placed.beforeLessonId, 'lesson_next');
check('and drawn in that lesson’s theme, which is the section Home has open',
  placed.themeId, 'theme_2');
// Once a grade is finished the roadmap's `nextLesson` falls back to the LAST
// node, which is completed. A stop must not claim to come before a lesson that
// is already done — it belongs at the end of the path instead.
const gradeFinished = practice({
  surfaced: [pItem('a')],
  nextLesson: { id: 'lesson_last', themeId: 'theme_9', isCompleted: true },
});
check('with the whole grade complete there is nothing to come before',
  gradeFinished.beforeLessonId, null);
check('but the stop still has a theme to be drawn in', gradeFinished.themeId, 'theme_9');
check('an empty curriculum leaves both blank rather than throwing',
  practice({ surfaced: [pItem('a')], nextLesson: null }).beforeLessonId, null);

console.log('\n  IDENTITY — one stop per local day, stable across refreshes');
const sameDay = practice({ surfaced: [pItem('a')], now: new Date(T0.getTime() + 6 * 3_600_000) });
check('two reads in the same local day describe the same stop',
  practice({ surfaced: [pItem('a')] }).id, sameDay.id);
const nextDay = practice({ surfaced: [pItem('a')], now: new Date(T0.getTime() + 12 * 3_600_000) });
check('crossing local midnight makes it a new stop',
  nextDay.id !== sameDay.id, true);
// The trap: at +05:30 the local midnight of the 23rd is 18:30Z on the 22nd, so
// formatting `startOfLocalDay` directly would label this stop with yesterday.
const lateEveningStop = practice({
  surfaced: [pItem('a')],
  now: new Date('2026-08-22T19:00:00.000Z'),
});
check('the id carries the LOCAL date, not the UTC date of local midnight',
  lateEveningStop.id, 'practice-2026-08-23');
check('while the instant it belongs to is still the local day’s start',
  lateEveningStop.scheduledFor, '2026-08-22T18:30:00.000Z');
check('and at T0 that instant matches calendar-day exactly',
  practice({ surfaced: [pItem('a')] }).scheduledFor,
  startOfLocalDay(T0, IST).toISOString());

console.log('\n  SIZE — the caps hold across the seam, and the estimate follows them');
// The cap belongs to planReviews, so the check that matters is the composed one:
// a five-skill backlog must still describe a two-skill session.
const bigBacklog = ['s1', 's2', 's3', 's4', 's5'];
const cappedPlan = planReviews({
  due: bigBacklog.map((id, i) => dueRow(id, 100 - i)),
  reviewableIds: reviewable(...bigBacklog),
  reviewsDoneToday: 0,
});
const cappedSession = practice({ surfaced: cappedPlan.surfaced.map((s) => pItem(s.skillId)) });
check('five skills due still describes maxReviewsAhead, not five',
  cappedSession.count, RM.maxReviewsAhead);
check('the session practices exactly what was surfaced, in that order',
  cappedSession.lessonIds.join(','), 's1,s2');
check('the estimate is count × the configured minutes per skill',
  cappedSession.estimatedMinutes, RM.maxReviewsAhead * RM.practiceMinutesPerSkill);
check('a ticked stop estimates no time at all', donePractice.estimatedMinutes, 0);
// A day over quota with skills still deferred: the child is finished for today
// and the rest come back tomorrow, so the stop ticks rather than nagging.
const spentPlan = planReviews({
  due: bigBacklog.map((id, i) => dueRow(id, 100 - i)),
  reviewableIds: reviewable(...bigBacklog),
  reviewsDoneToday: RM.maxReviewsPerDay,
});
const spentSession = practice({
  surfaced: spentPlan.surfaced.map((s) => pItem(s.skillId)),
  reviewsDoneToday: RM.maxReviewsPerDay,
});
check('a day over quota ticks even with skills still deferred',
  spentSession.isCompleted, true);
check('and those skills are still counted as waiting, by the plan',
  spentPlan.deferredCount, bigBacklog.length);

console.log('\n  THE LINE OF TEXT — one line on a card, so it must fit');
check('a single short lesson name is quoted, which is the most useful thing to say',
  practice({ surfaced: [pItem('a', 'Shapes')] }).subtitle, 'Shapes');
check('two skills are counted rather than listed',
  practice({ surfaced: [pItem('a', 'Shapes'), pItem('b', 'Sorting')] }).subtitle,
  '2 skills to practice');
// The card renders this at numberOfLines={1}, so a long curriculum title would
// clip mid-word. The count phrasing is less specific but always a finished line.
check('a title too long for one line falls back to the count instead of clipping',
  practice({ surfaced: [pItem('a', 'Matching the animals to the sounds they make')] }).subtitle,
  '1 skill to practice');

console.log('\n  THE GATE — a finished session never keeps the next lesson shut');
check('a blocking plan makes a blocking stop',
  practice({ surfaced: [pItem('a')], isBlocking: true }).isBlocking, true);
check('but once the day’s practice is done, nothing is held back',
  practice({ reviewsDoneToday: 3, isBlocking: true }).isBlocking, false);
check('the stop never claims to be a lesson the app could open',
  Object.prototype.hasOwnProperty.call(practice({ surfaced: [pItem('a')] }), 'activities'),
  false
);


line('12. THE GARDEN — subjects as patches, skills as blooms, judged on today’s score');

// A frozen "now" so decay and the band boundaries are exact.
const G_NOW = new Date('2026-08-27T09:00:00.000Z');
const G_DAY = 24 * 60 * 60 * 1000;

// A SkillHealth-shaped row. Defaults keep decay at zero (practiced "now"), so a
// band test lands on the raw score; the stored masteryState is deliberately
// wrong ('NEW') to prove the projection re-bands from the score, never trusts it.
const gh = (score, opts = {}) => ({
  masteryScore: score,
  retentionScore: opts.retention ?? score,
  confidenceScore: opts.confidence ?? score,
  masteryState: opts.masteryState ?? 'NEW',
  lastPracticed: opts.lastPracticed ?? G_NOW,
  decayFactor: opts.decayFactor ?? null,
});
const gskill = (skillId, state, health, title = skillId, difficulty = 1) => ({
  skillId, title, difficulty, state, health,
});
const gardenOf = (id, skills) => buildGarden({ subjects: [{ id, name: id, skills }], now: G_NOW }).subjects[0];
const byId = (subject) => Object.fromEntries(subject.skills.map((s) => [s.skillId, s]));

// Every band boundary, mapped to a stage by NAME (never the enum's ordinal —
// LEARNING sorts before WEAK yet is the worse band, the trap this dodges).
const bandSkills = [
  gskill('b39', 'COMPLETED', gh(39)),
  gskill('b40', 'COMPLETED', gh(40)),
  gskill('b59', 'COMPLETED', gh(59)),
  gskill('b60', 'COMPLETED', gh(60)),
  gskill('b84', 'COMPLETED', gh(84)),
  gskill('b85', 'COMPLETED', gh(85)),
  gskill('bseed', 'AVAILABLE', null),
];
const bandPatch = gardenOf('bands', bandSkills);
const B = byId(bandPatch);

console.log('\n  BAND BOUNDARIES — score → band → bloom stage');
check('39 is LEARNING (the worst band), not WEAK', B.b39.masteryState, 'LEARNING');
check('39 → sprout', B.b39.stage, 'sprout');
check('40 crosses into WEAK', B.b40.masteryState, 'WEAK');
check('40 → bud', B.b40.stage, 'bud');
check('59 is still WEAK (upper edge)', B.b59.stage, 'bud');
check('60 crosses into STRONG', B.b60.masteryState, 'STRONG');
check('60 → opening', B.b60.stage, 'opening');
check('84 is still STRONG (upper edge)', B.b84.stage, 'opening');
check('85 crosses into MASTERED', B.b85.masteryState, 'MASTERED');
check('85 → bloom', B.b85.stage, 'bloom');
check('a never-started flower is a seed', B.bseed.stage, 'seed');
check('a never-started flower reports no band', B.bseed.masteryState, null);
check('a never-started flower reports mastery 0', B.bseed.masteryScore, 0);

console.log('\n  PATCH AGGREGATES — one tinted patch per subject');
// growthPercent = mean live mastery over EVERY flower, un-started counting as 0:
// (39+40+59+60+84+85+0) / 7 = 367/7 = 52.43 → 52.
check('growthPercent is the mean live mastery over every flower', bandPatch.growthPercent, 52);
check('the bloom tally sums to the skill count (no flower uncounted)',
  BLOOM_STAGES.reduce((a, k) => a + bandPatch.bloomTally[k], 0), bandPatch.skillCount);
check('the tally puts the un-started flower in seed', bandPatch.bloomTally.seed, 1);
check('the tally puts both WEAK flowers in bud', bandPatch.bloomTally.bud, 2);
check('the brightest bloom is the fullest flower', bandPatch.brightestBloom?.skillId, 'b85');
// Thirsty = COMPLETED and below the review line (85). Five of six qualify; the
// un-started seed cannot be thirsty because it never bloomed.
check('thirst counts finished flowers below the review line', bandPatch.thirstyCount, 5);

console.log('\n  WILTING — an unwatered flower drops a stage, and Home would call it thirsty');
const freshBloom = gardenOf('fresh', [
  gskill('m90', 'COMPLETED', gh(90, { retention: 90, decayFactor: 0.995, lastPracticed: G_NOW })),
]).skills[0];
const staleBloom = gardenOf('stale', [
  gskill('m90', 'COMPLETED', gh(90, { retention: 90, decayFactor: 0.995, lastPracticed: new Date(G_NOW.getTime() - 60 * G_DAY) })),
]).skills[0];
check('practiced today, 90 stays MASTERED in full bloom', freshBloom.stage, 'bloom');
check('practiced today, it is not thirsty', freshBloom.needsWater, false);
// 90 × (retention lost over 60 days at 0.995/day) × weight 0.25 ⇒ 84.16 → 84.
check('60 days untouched, the same 90 has decayed to 84', staleBloom.masteryScore, 84);
check('so it drops from bloom to opening', staleBloom.stage, 'opening');
check('and it now reads thirsty — exactly what Home would surface', staleBloom.needsWater, true);

console.log('\n  PLACEMENT NOISE — a locked row is never a sprout; a growing flower is never thirsty');
const noisePatch = gardenOf('noise', [
  gskill('locked', 'LOCKED', gh(50)),   // placement wrote a health row the child never earned
  gskill('active', 'ACTIVE', null),     // just activated, no practice yet
]);
const N = byId(noisePatch);
check('a LOCKED skill stays a seed despite a score-50 placement row', N.locked.stage, 'seed');
check('and it contributes no band', N.locked.masteryState, null);
check('a just-activated skill is a sprout, not a seed', N.active.stage, 'sprout');
check('a growing (un-finished) flower is never thirsty', N.active.needsWater, false);
check('the locked flower adds nothing to the patch’s growth', noisePatch.growthPercent, 0);

console.log('\n  UNSEEDED PATCH — the failsafe garden: real, but every flower a seed');
const seedPatch = gardenOf('seedbed', [
  gskill('z1', 'AVAILABLE', null),
  gskill('z2', 'AVAILABLE', null),
  gskill('z3', 'AVAILABLE', null),
]);
check('an unseeded patch grows 0%', seedPatch.growthPercent, 0);
check('every flower is a seed', seedPatch.bloomTally.seed, 3);
check('no flower is thirsty', seedPatch.thirstyCount, 0);
check('there is no brightest bloom yet', seedPatch.brightestBloom, null);

console.log('\n  TOTALS — the panorama’s own summary line, over the whole garden');
const whole = buildGarden({
  subjects: [
    { id: 'bands', name: 'bands', skills: bandSkills },
    { id: 'seedbed', name: 'seedbed', skills: [gskill('z1', 'AVAILABLE', null), gskill('z2', 'AVAILABLE', null), gskill('z3', 'AVAILABLE', null)] },
  ],
  now: G_NOW,
});
check('totals count every subject', whole.totals.subjectCount, 2);
check('totals count every skill', whole.totals.skillCount, 10);
check('totals count finished skills', whole.totals.completedCount, 6);
check('totals carry the thirsty backlog', whole.totals.thirstyCount, 5);
// (367 + 0) / 10 = 36.7 → 37.
check('overall growth is the mean over the whole garden', whole.totals.overallGrowthPercent, 37);


// ===========================================================================
process.exit(failures === 0 ? 0 : 1);
