/**
 * "Your Garden" — the child-facing mastery map, as one pure projection.
 *
 * Why this is a separate, pure module
 * -----------------------------------
 * The Explore tab used to be a text catalog of subjects and skills. Reworked
 * into a garden a five-year-old can read, every subject is a patch of ground and
 * every skill is a flower at some stage of bloom. That reframing needs three
 * numbers the plain `/curriculum` projection never computed:
 *
 *   1. how grown a whole patch is  (`growthPercent`),
 *   2. what stage each flower is at (`stage`), and
 *   3. which flowers are thirsty    (`needsWater`).
 *
 * All three must be judged on the child's mastery *as it stands today*, not as
 * it was on the day it was last written. `/curriculum` returns the stored
 * `SkillHealth.masteryScore` verbatim, so a skill practiced to 90 two months ago
 * still reads 90 there. A garden that never wilts is a lie a child learns to
 * ignore, so this module runs every score through `projectDecayedHealth` first —
 * the same lazy-decay projection the roadmap and the reinforcement sweep use,
 * because there is no scheduler in this backend to age a row between sessions.
 *
 * Kept pure — no repositories, no `prisma` — for the same reason the review
 * modules are: `scripts/engine-harness/run.sh` can then execute the band
 * boundaries and the thirst rule with no database. The controller does the I/O
 * and hands plain rows in.
 *
 * Consistency with Home ("Practice first")
 * ----------------------------------------
 * A flower is thirsty on exactly the predicate the engine uses to keep a skill
 * in the reinforcement queue — `review-cadence.ts::needsReview`, i.e. the decayed
 * mastery has fallen below `keepInQueueBelowScore` — restricted to skills the
 * child has actually finished (`COMPLETED`), which is the same "reviewable"
 * gate the roadmap applies. Home then surfaces a *capped, rotating* slice of that
 * backlog (`maxReviewsPerDay` / `maxReviewsAhead`); the garden shows the whole of
 * it. So Home's list is always a subset of the garden's thirsty flowers — the two
 * can never contradict each other, and the map never hides a wilting flower just
 * because the roadmap chose two others to practice first today. Deliberately not
 * keyed on `nextReviewDate`: a flower at mastery 40 must look thirsty now, not on
 * the day its next review happens to fall due.
 */

import { CurriculumState, MasteryState } from '../../shared/enums.js';
import { HealthSnapshot, needsReview, projectDecayedHealth } from '../mastery/review-cadence.js';

/**
 * The five stages of a flower, weakest to fullest. Named by shape, never by a
 * number the child cannot read, and mapped from the mastery *band* by name — not
 * by the enum's ordinal, which is not its severity order (LEARNING sorts before
 * WEAK yet is the worse band). Mapping by name is what keeps this module clear of
 * the band-order trap that has bitten nine call sites elsewhere.
 */
export type BloomStage = 'seed' | 'sprout' | 'bud' | 'opening' | 'bloom';

export const BLOOM_STAGES: readonly BloomStage[] = ['seed', 'sprout', 'bud', 'opening', 'bloom'];

/** One skill as the aggregator needs it: its curriculum state and its raw health row (or null). */
export interface GardenSkillInput {
  readonly skillId: string;
  readonly title: string;
  readonly difficulty: number;
  /** Curriculum state for this child: LOCKED / AVAILABLE / ACTIVE / COMPLETED. */
  readonly state: CurriculumState | string;
  /** The stored `SkillHealth` row, or null if the child has never had one written. */
  readonly health: HealthSnapshot | null;
}

export interface GardenSubjectInput {
  readonly id: string;
  readonly name: string;
  readonly skills: readonly GardenSkillInput[];
}

/** A single flower, resolved to what the app draws. */
export interface GardenSkill {
  readonly skillId: string;
  readonly title: string;
  readonly difficulty: number;
  readonly state: string;
  /** Today's mastery — decayed, rounded, 0 for anything not yet engaged. */
  readonly masteryScore: number;
  /** Today's band, re-computed from the decayed score. Null until the child engages the skill. */
  readonly masteryState: MasteryState | null;
  readonly stage: BloomStage;
  readonly needsWater: boolean;
}

export interface BrightestBloom {
  readonly skillId: string;
  readonly title: string;
  readonly masteryScore: number;
  readonly masteryState: MasteryState;
}

export interface GardenSubject {
  readonly id: string;
  readonly name: string;
  readonly skillCount: number;
  /** Mean of every flower's live mastery, 0-100. Never-engaged flowers count as 0. */
  readonly growthPercent: number;
  /** How many flowers sit at each stage. Sums to `skillCount`. */
  readonly bloomTally: Record<BloomStage, number>;
  /** Flowers that have bloomed and are now fading — the ones to water. */
  readonly thirstyCount: number;
  /** The fullest flower in the patch, for the panorama's focal bloom. Null when nothing is engaged. */
  readonly brightestBloom: BrightestBloom | null;
  readonly skills: readonly GardenSkill[];
}

export interface GardenTotals {
  readonly subjectCount: number;
  readonly skillCount: number;
  readonly completedCount: number;
  readonly thirstyCount: number;
  /** Mean live mastery across every flower in every patch. */
  readonly overallGrowthPercent: number;
}

export interface Garden {
  readonly subjects: readonly GardenSubject[];
  readonly totals: GardenTotals;
}

export interface GardenInput {
  readonly subjects: readonly GardenSubjectInput[];
  readonly now: Date;
}

function isEngaged(state: string): boolean {
  return state === CurriculumState.ACTIVE || state === CurriculumState.COMPLETED;
}

function emptyTally(): Record<BloomStage, number> {
  return { seed: 0, sprout: 0, bud: 0, opening: 0, bloom: 0 };
}

/**
 * Band -> stage, by name. LOCKED and AVAILABLE flowers are always `seed`
 * regardless of any health row: placement writes a dated, score-0 `SkillHealth`
 * for every locked skill in the system, and score 0 bands as LEARNING — so
 * keying stage off the band alone would sprout flowers the child has never
 * touched. Only an engaged skill (ACTIVE/COMPLETED) grows past a seed.
 */
function stageFor(state: string, band: MasteryState | null): BloomStage {
  if (!isEngaged(state)) return 'seed';
  switch (band) {
    case MasteryState.LEARNING:
      return 'sprout';
    case MasteryState.WEAK:
      return 'bud';
    case MasteryState.STRONG:
      return 'opening';
    case MasteryState.MASTERED:
      return 'bloom';
    default:
      // Engaged but unscored (just activated, no practice yet): a fresh sprout.
      return 'sprout';
  }
}

/**
 * Resolve one skill to a flower. An engaged skill is judged on its decayed
 * health; an un-engaged one is a seed with mastery 0 and no band, whatever noise
 * a placement row might carry.
 */
function resolveSkill(input: GardenSkillInput, now: Date): GardenSkill {
  const engaged = isEngaged(input.state);

  let masteryScore = 0;
  let band: MasteryState | null = null;
  let needsWater = false;

  if (engaged && input.health) {
    const decayed = projectDecayedHealth(input.health, now);
    masteryScore = Math.round(decayed.masteryScore);
    band = decayed.masteryState;
    // Only a finished flower can be thirsty; a growing one is simply not full yet.
    needsWater = input.state === CurriculumState.COMPLETED && needsReview(input.health, now);
  } else if (engaged) {
    // Engaged but no health row yet (freshly activated): a sprout at 0.
    band = MasteryState.LEARNING;
  }

  return {
    skillId: input.skillId,
    title: input.title,
    difficulty: input.difficulty,
    state: String(input.state),
    masteryScore,
    masteryState: engaged ? band : null,
    stage: stageFor(String(input.state), engaged ? band : null),
    needsWater,
  };
}

function resolveSubject(input: GardenSubjectInput, now: Date): GardenSubject {
  const skills = input.skills.map((s) => resolveSkill(s, now));

  const tally = emptyTally();
  let masterySum = 0;
  let thirstyCount = 0;
  let brightest: BrightestBloom | null = null;

  for (const skill of skills) {
    tally[skill.stage] += 1;
    masterySum += skill.masteryScore;
    if (skill.needsWater) thirstyCount += 1;

    if (skill.masteryState !== null) {
      const isBrighter =
        !brightest ||
        skill.masteryScore > brightest.masteryScore ||
        // Deterministic tie-break so the focal flower does not flicker between reads.
        (skill.masteryScore === brightest.masteryScore && skill.skillId < brightest.skillId);
      if (isBrighter) {
        brightest = {
          skillId: skill.skillId,
          title: skill.title,
          masteryScore: skill.masteryScore,
          masteryState: skill.masteryState,
        };
      }
    }
  }

  const growthPercent = skills.length > 0 ? Math.round(masterySum / skills.length) : 0;

  return {
    id: input.id,
    name: input.name,
    skillCount: skills.length,
    growthPercent,
    bloomTally: tally,
    thirstyCount,
    brightestBloom: brightest,
    skills,
  };
}

/**
 * Build the whole garden. Pure: same input, same output, no clock of its own —
 * `now` is passed so the harness can freeze time and assert the decay and the
 * band boundaries exactly.
 */
export function buildGarden(input: GardenInput): Garden {
  const subjects = input.subjects.map((s) => resolveSubject(s, input.now));

  let skillCount = 0;
  let completedCount = 0;
  let thirstyCount = 0;
  let masterySum = 0;

  for (const subject of subjects) {
    for (const skill of subject.skills) {
      skillCount += 1;
      masterySum += skill.masteryScore;
      if (skill.state === CurriculumState.COMPLETED) completedCount += 1;
      if (skill.needsWater) thirstyCount += 1;
    }
  }

  return {
    subjects,
    totals: {
      subjectCount: subjects.length,
      skillCount,
      completedCount,
      thirstyCount,
      overallGrowthPercent: skillCount > 0 ? Math.round(masterySum / skillCount) : 0,
    },
  };
}
