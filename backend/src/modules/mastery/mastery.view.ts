import { MasteryState } from '../../shared/enums.js';
import {
  projectDecayedHealth,
  isReviewDue,
  reviewPriority,
  cadenceDaysFor,
} from './review-cadence.js';

/**
 * The shape the app is given for a child's skill.
 *
 * `/mastery/child/:childId` and `/mastery/weak-skills` used to return raw
 * `SkillHealth` rows straight from Prisma, and every screen that consumed them
 * was wrong about the result in a different way:
 *
 *   - `SkillMasteryScreen` (reachable from the parent dashboard) typed the
 *     response as `[{ category, skills: [...] }]` and did `cat.skills.map(...)`.
 *     A flat row has no `.skills`, so the moment a child had a single health row
 *     that screen threw inside its `useMemo`. It only ever looked healthy
 *     because the table was empty — which, before the engine was wired to the
 *     completion path, it always was.
 *   - `MasteryScreen` compared `masteryState` against `'mastered'`,
 *     `'in_progress'` and `'locked'`; the Prisma enum is `NEW | LEARNING |
 *     WEAK | STRONG | MASTERED`, so all three of its totals were permanently 0.
 *   - `AITutorHomeScreen` renders `skillName`, `domain`, `gap` and `priority` on
 *     its weak-skill cards. A `SkillHealth` row has none of those four, so the
 *     cards drew a score with no name attached to it.
 *
 * Rather than teach three screens to reassemble a database row, the endpoints
 * now return this. It is also the smaller payload: a raw row shipped
 * `decayFactor`, `frequencyDays` and `retryCount` — engine internals — to a
 * client that had no business reading them.
 *
 * Every score here is the score *today*. A stored row is a record of the last
 * session; `projectDecayedHealth` applies the forgetting curve, so a skill that
 * scored 86 three weeks ago and has not been touched since reports as the 79 it
 * has become, in the same band the engine itself would place it in. `storedScore`
 * is kept beside it so a parent screen can say "was 86, now 79" rather than
 * silently contradicting the number it showed last month.
 */
export interface SkillMasteryView {
  readonly skillId: string;
  readonly skillName: string;
  /** Curriculum domain name, falling back to the subject, then to 'General'. */
  readonly domain: string;
  readonly subject: string;
  /** Band of the decayed score — what the engine would call this skill now. */
  readonly masteryState: MasteryState;
  /** Decayed mastery, 0-100, one decimal. */
  readonly masteryScore: number;
  /** What was recorded at the end of the last session, undecayed. */
  readonly storedScore: number;
  /** True when the decay has cost this skill a point or more since then. */
  readonly isSlipping: boolean;
  /** The skill's own mastery threshold (`Skill.masteryThreshold`). */
  readonly threshold: number;
  /** Points still needed to reach the threshold. 0 once it is met. */
  readonly gap: number;
  readonly priority: MasteryPriority;
  /** The engine's own queue priority, so a list can order by it rather than re-rank. */
  readonly priorityScore: number;
  readonly confidence: number;
  readonly retention: number;
  /** Whole local days since the child last practiced. 0 means today. */
  readonly daysSincePractice: number;
  readonly lastAssessed: string | null;
  readonly nextReviewAt: string | null;
  readonly isDue: boolean;
  readonly reviewCount: number;
  readonly attemptCount: number;
}

export type MasteryPriority = 'high' | 'medium' | 'low';

/**
 * The part of a `SkillHealth` row (with `skill` included) this projection needs.
 * Structural, so a real Prisma row satisfies it without a cast, and the harness
 * can pass a literal.
 */
export interface SkillHealthWithSkill {
  readonly skillId: string;
  readonly masteryState: MasteryState | string;
  readonly masteryScore: number;
  readonly confidenceScore: number;
  readonly retentionScore: number;
  readonly lastPracticed: Date | string;
  readonly nextReviewDate?: Date | string | null;
  readonly reviewCount?: number | null;
  readonly attemptCount?: number | null;
  readonly decayFactor?: number | null;
  readonly skill?: {
    readonly name?: string | null;
    readonly masteryThreshold?: number | null;
    readonly domain?: { readonly name?: string | null } | null;
    readonly subject?: { readonly name?: string | null } | null;
  } | null;
}

/**
 * Mirrors `Skill.masteryThreshold`'s schema default, and only applies when a
 * caller passes a row without its `skill` relation included.
 */
const DEFAULT_THRESHOLD = 80;

const round1 = (value: number): number =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;

/**
 * How urgently this wants attention, in the three words the app's cards already
 * speak — read off the cadence table rather than from a set of cutoffs invented
 * here.
 *
 * The two scales are the same judgement. `cadenceDaysByState` already says how
 * soon the engine wants each band back: 1 day for LEARNING and WEAK, 2 for
 * STRONG, 3 for MASTERED. "Comes back tomorrow" is what high priority means, so
 * deriving one from the other is not a coincidence to be maintained by hand —
 * retune the cadence and the cards follow.
 *
 * This replaces a switch that mapped WEAK to 'high' and LEARNING to 'medium',
 * which had the two worst bands the wrong way round: `masteryStateFor` puts
 * everything below 40 in LEARNING and 40-59 in WEAK, so the switch called a
 * skill at 30 less urgent than a skill at 50. The bands do not read in enum
 * order, and anything that ranks them must consult the thresholds, not the
 * names. (NEW cannot arise here — banding a score never produces it — but it is
 * mapped rather than defaulted so the record stays total.)
 */
function priorityBandFor(state: MasteryState): MasteryPriority {
  const days = cadenceDaysFor(state);
  if (days <= 1) return 'high';
  if (days <= 2) return 'medium';
  return 'low';
}

const iso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function toSkillMasteryView(
  row: SkillHealthWithSkill,
  now: Date = new Date()
): SkillMasteryView {
  const decayed = projectDecayedHealth(
    {
      masteryScore: row.masteryScore,
      retentionScore: row.retentionScore,
      confidenceScore: row.confidenceScore,
      masteryState: row.masteryState,
      lastPracticed: row.lastPracticed,
      decayFactor: row.decayFactor,
    },
    now
  );

  const threshold = row.skill?.masteryThreshold ?? DEFAULT_THRESHOLD;
  const masteryScore = round1(decayed.masteryScore);
  const storedScore = round1(row.masteryScore);

  return {
    skillId: row.skillId,
    /*
     * `skill.name` is the only human-readable name a health row can reach —
     * there is no denormalised title on the row itself. Falling back to the id
     * would print a UUID on a parent's screen, so an un-joined row says so.
     */
    skillName: row.skill?.name?.trim() || 'Untitled skill',
    domain: row.skill?.domain?.name?.trim() || row.skill?.subject?.name?.trim() || 'General',
    subject: row.skill?.subject?.name?.trim() || 'General',
    masteryState: decayed.masteryState,
    masteryScore,
    storedScore,
    isSlipping: storedScore - masteryScore >= 1,
    threshold: round1(threshold),
    gap: round1(Math.max(0, threshold - decayed.masteryScore)),
    priority: priorityBandFor(decayed.masteryState),
    priorityScore: reviewPriority({
      masteryScore: decayed.masteryScore,
      retentionScore: decayed.retentionScore,
      confidenceScore: decayed.confidenceScore,
    }),
    confidence: round1(decayed.confidenceScore),
    retention: round1(decayed.retentionScore),
    daysSincePractice: decayed.daysSincePractice,
    lastAssessed: iso(row.lastPracticed),
    nextReviewAt: iso(row.nextReviewDate),
    isDue: isReviewDue(row.nextReviewDate, now),
    reviewCount: row.reviewCount ?? 0,
    attemptCount: row.attemptCount ?? 0,
  };
}

/**
 * Highest priority first, then the weakest score, then by name so the order is
 * total. Weak-skill lists and the mastery table share it, so a skill cannot
 * appear third on one screen and first on another.
 */
export function toSkillMasteryViews(
  rows: readonly SkillHealthWithSkill[],
  now: Date = new Date()
): SkillMasteryView[] {
  return rows
    .map((row) => toSkillMasteryView(row, now))
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        a.masteryScore - b.masteryScore ||
        a.skillName.localeCompare(b.skillName)
    );
}
