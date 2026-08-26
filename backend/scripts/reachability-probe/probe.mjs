/*
 * How much of the curriculum a child can actually reach.
 *
 * The unlock gate is the one piece of engine logic whose failure mode is silent:
 * nothing errors, the child simply runs out of lessons. This probe executes the
 * real `evaluateLessonUnlock` / `determineNextAvailableLesson` against the real
 * curriculum JSON — no database, no reimplementation — and walks a simulated
 * child forward until nothing else opens.
 *
 * The scores it feeds the gate are produced by the real scoring functions for a
 * fully engaged, unaided first session, so the two halves of the loop (what a
 * lesson scores, and what that score unlocks) are checked against each other
 * rather than against my assumptions about either.
 */
import { curriculumService } from './modules/curriculum/curriculum.service.js';
import { curriculumEngineService as engine } from './modules/curriculum/curriculum-engine.service.js';
import { describeUnlockDecision } from './modules/curriculum/unlock-policy.js';
import { starsToAccuracy } from './modules/progress/lesson-evidence.js';
import { masteryEngineService as m } from './modules/mastery/mastery.service.js';
import * as scoring from './modules/mastery/mastery-scoring.js';
import { engineConfig } from './shared/config/engine.config.js';

const GRADES = ['prenursery', 'nursery', 'lkg', 'ukg'];
const NOW = new Date('2026-08-22T09:00:00.000Z');

let failures = 0;
function check(label, actual, expected) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} = ${actual}`);
}

/**
 * What one honest, fully engaged first pass at a lesson scores — including the
 * unproven-evidence ceiling, because a single pass is by definition unproven.
 */
function firstPassScore(accuracy) {
  const raw = m.calculateMasteryScore({
    knowledgeScore: m.calculateKnowledgeScore(accuracy),
    retentionScore: m.calculateRetentionScore(null, NOW, accuracy),
    confidenceScore: m.calculateConfidenceScore({ accuracy, attempts: 4, retries: 0, helpRequests: 0 }),
    engagementScore: 100,
    consistencyScore: scoring.consistencyScore([accuracy]).score,
  });
  return Math.min(raw, engineConfig.unified.evidence.unprovenScoreCeiling);
}

/**
 * Walk a child through a grade, completing whatever the engine offers next.
 *
 * `mastery` is written as a high-water mark, mirroring
 * `knowledge-state.writer.ts`, so this is the same number the live gate reads.
 */
function walk(gradeId, score) {
  const lessons = curriculumService.getLessonsInCurriculumOrder(gradeId);
  const progress = [];
  const knowledge = new Map();
  let reached = 0;

  for (;;) {
    const states = [];
    for (const [topicId, mastery] of knowledge) states.push({ topicId, mastery });

    const nextId = engine.determineNextAvailableLesson(lessons, progress, states);
    if (!nextId) break;

    reached += 1;
    progress.push({ lessonId: nextId, status: 'COMPLETED' });
    knowledge.set(nextId, Math.max(knowledge.get(nextId) ?? 0, score));
  }

  // Why it stopped: the first lesson still shut, in the child's own words.
  const completed = new Set(progress.map((p) => p.lessonId));
  const states = [];
  for (const [topicId, mastery] of knowledge) states.push({ topicId, mastery });
  const blocked = lessons.find((n) => !completed.has(n.id));
  const decision = blocked
    ? engine.evaluateLessonUnlock(blocked.id, lessons, progress, states)
    : null;

  return {
    total: lessons.length,
    reached,
    blockedTitle: blocked?.title ?? null,
    reason: decision?.reason ?? null,
    weightedScore: decision ? Math.round(decision.weightedScore * 10) / 10 : null,
    advice: decision ? describeUnlockDecision(decision, (id) => curriculumService.getLessonById(id)?.title) : null,
  };
}

const line = (s) => console.log('\n' + s + '\n' + '-'.repeat(s.length));

line('0. THE GATE UNDER TEST');
console.log('  unlock  ', JSON.stringify(engineConfig.unified.unlock));
console.log('  gateMode', engineConfig.unified.roadmap.gateMode);
console.log(
  '  every curriculum node declares mastery.required_score = 80; the gate takes\n' +
  '  min(declared, weightedThreshold), so the effective threshold is ' +
  Math.min(80, engineConfig.unified.unlock.weightedThreshold) + '.'
);

line('1. WHAT A FIRST PASS SCORES');
const PROFILES = [
  ['nothing recorded (the pre-Stage-1 live gate)', 0],
  ['1 star everywhere', firstPassScore(starsToAccuracy(1, true))],
  ['2 stars everywhere', firstPassScore(starsToAccuracy(2, true))],
  ['3 stars everywhere', firstPassScore(starsToAccuracy(3, true))],
];
for (const [name, score] of PROFILES) {
  console.log(`  ${name.padEnd(44)} -> mastery ${Math.round(score * 10) / 10}`);
}

line('2. REACHABILITY — hard gate, child completes everything offered');
const results = new Map();
for (const [name, score] of PROFILES) {
  console.log(`\n  ${name}  (mastery ${Math.round(score * 10) / 10})`);
  for (const gradeId of GRADES) {
    const r = walk(gradeId, score);
    results.set(`${name}|${gradeId}`, r);
    const pct = ((r.reached / r.total) * 100).toFixed(1);
    console.log(
      `    ${gradeId.padEnd(11)} ${String(r.reached).padStart(4)}/${r.total} (${pct.padStart(5)}%)` +
      (r.reason ? `  stopped: ${r.reason} @ ${r.weightedScore} — "${r.advice}"` : '  all reached')
    );
  }
}

line('3. WHAT THE NUMBERS HAVE TO SHOW');
const at = (name, gradeId) => results.get(`${name}|${gradeId}`);
const [nothing, oneStar, twoStar, threeStar] = PROFILES.map(([n]) => n);

// The defect this stage exists to fix: with nothing written, one lesson opened.
check(
  'an unwritten mastery store still strands the child at lesson 1',
  at(nothing, 'prenursery').reached,
  1
);
for (const gradeId of GRADES) {
  check(
    `${gradeId}: two stars opens the whole grade`,
    at(twoStar, gradeId).reached,
    at(twoStar, gradeId).total
  );
  check(
    `${gradeId}: three stars opens the whole grade`,
    at(threeStar, gradeId).reached,
    at(threeStar, gradeId).total
  );
}
check(
  'a 1-star pass is held for practice, not passed silently',
  at(oneStar, 'prenursery').reached < at(oneStar, 'prenursery').total,
  true
);
check(
  'and it is held on the score, not on sequence',
  at(oneStar, 'prenursery').reason,
  (v) => v === 'WEIGHTED_SCORE_BELOW_THRESHOLD' || v === 'PREREQUISITE_BELOW_FLOOR'
);
check(
  'that refusal is one a soft gate forgives, so nobody is walled',
  engineConfig.unified.roadmap.gateMode === 'soft',
  true
);
console.log(
  '\n  Under the shipped soft gate a score refusal opens the lesson and queues the\n' +
  '  weak prerequisite as a review instead (lesson-access.service.ts). Sequence\n' +
  '  refusals — an unfinished previous lesson — still hold in both modes.'
);

line(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
