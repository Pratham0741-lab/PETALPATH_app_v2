/**
 * The mastery contract, in one place.
 *
 * `/mastery/child/:childId`, `/mastery/weak-skills` and `/mastery/:skillId` all
 * return the same projection now (`backend/src/modules/mastery/mastery.view.ts`).
 * They did not used to: they returned raw `SkillHealth` rows, and four screens
 * each guessed a different shape for them —
 *
 *   - `screens/parent/SkillMasteryScreen` expected `[{ category, skills }]` and
 *     called `.skills.map()`, which throws on a flat row;
 *   - `screens/mastery/MasteryScreen` matched `'mastered' | 'in_progress' |
 *     'locked'` against an uppercase enum, so all of its totals stayed 0;
 *   - `screens/ai-tutor/AITutorHomeScreen` printed `skillName`, `domain`, `gap`
 *     and `priority`, none of which exist on a database row;
 *   - `screens/reinforcement/ReinforcementQueueScreen` filtered on a `status`
 *     field the server never sent.
 *
 * Three declarations of the same payload is how that happened, so the types live
 * here and the API modules import them.
 */

/** `MasteryState` as Prisma spells it. Uppercase — this is the whole trap. */
export type MasteryStateName = 'NEW' | 'LEARNING' | 'WEAK' | 'STRONG' | 'MASTERED';

/** How urgently a skill wants attention. Banded from `masteryState` server-side. */
export type MasteryPriority = 'high' | 'medium' | 'low';

/**
 * One skill's health, as of today.
 *
 * `masteryScore` has the forgetting curve already applied, so it is what the
 * skill is worth *now*; `storedScore` is what the last session recorded. When
 * they differ, `isSlipping` is true and a parent screen can say "was 86, now 79"
 * instead of quietly contradicting the number it showed last month.
 */
export interface SkillMasteryView {
  skillId: string;
  skillName: string;
  /** Curriculum domain, falling back to the subject, then to 'General'. */
  domain: string;
  subject: string;
  masteryState: MasteryStateName;
  /** Decayed mastery, 0-100, one decimal. */
  masteryScore: number;
  /** Undecayed — what the end of the last session recorded. */
  storedScore: number;
  isSlipping: boolean;
  threshold: number;
  /** Points still needed to reach `threshold`. 0 once it is met. */
  gap: number;
  priority: MasteryPriority;
  /** The engine's queue priority. Lists should order by this, not re-rank. */
  priorityScore: number;
  confidence: number;
  retention: number;
  /** Whole local days since the last practice. 0 means today. */
  daysSincePractice: number;
  lastAssessed: string | null;
  nextReviewAt: string | null;
  isDue: boolean;
  reviewCount: number;
  attemptCount: number;
}

/**
 * Child-facing wording for each state. Four words at most — these sit in chips.
 *
 * `LEARNING` reads as "Needs help" rather than the softer "Learning" it used to,
 * because of the band boundaries recorded on `MASTERY_STATE_ORDER` below: it is
 * the bottom band, not a midpoint. Calling it "Learning" put the app's calmest
 * word on its most worrying score.
 */
export const MASTERY_STATE_LABELS: Record<MasteryStateName, string> = {
  MASTERED: 'Mastered',
  STRONG: 'Strong',
  LEARNING: 'Needs help',
  WEAK: 'Needs practice',
  NEW: 'Not started',
};

/**
 * Worst first. Used wherever states are grouped or sorted, so "Needs practice"
 * cannot land above "Mastered" on one screen and below it on another.
 *
 * The order is not the enum's declaration order, and this is the trap in the
 * whole file. The server bands a score with `masteryStateFor`, against
 * `stateThresholds = { learning: 40, weak: 60, strong: 85 }`:
 *
 *     < 40  LEARNING      40-59  WEAK      60-84  STRONG      >= 85  MASTERED
 *
 * So LEARNING is *below* WEAK — a skill at 30 is in worse shape than one at 50 —
 * and `NEW` is not a floor but an absence, a skill with nothing measured yet. Any
 * ranking, colour ramp or "needs attention" filter has to come from this list or
 * from the server's `priority`, never from the order the enum happens to declare.
 */
export const MASTERY_STATE_ORDER: MasteryStateName[] = [
  'LEARNING',
  'WEAK',
  'NEW',
  'STRONG',
  'MASTERED',
];

const KNOWN_STATES = new Set<string>(MASTERY_STATE_ORDER);

/**
 * Coerce whatever arrived into a state name.
 *
 * Defensive on purpose: this is the seam where an older deployment, or a cached
 * response written before the projection shipped, can still hand us a lowercase
 * word. Anything unrecognised becomes `NEW` rather than being dropped, because a
 * skill missing from a total is harder to notice than one in the wrong column.
 */
export function toMasteryStateName(value: unknown): MasteryStateName {
  if (typeof value !== 'string') return 'NEW';
  const upper = value.trim().toUpperCase();
  if (KNOWN_STATES.has(upper)) return upper as MasteryStateName;
  /*
   * Legacy vocabulary from before the enum was exposed. `IN_PROGRESS` is the
   * uncomfortable one: it meant "started, not finished", which spans three of
   * today's bands, and it resolves to the worst of them. That is the deliberate
   * direction — a skill wrongly shown as needing help gets offered extra
   * practice, whereas one wrongly shown as strong gets quietly dropped from the
   * review queue. It should also be unreachable; a server on the current
   * projection only ever sends the five names above.
   */
  if (upper === 'IN_PROGRESS') return 'LEARNING';
  if (upper === 'NEEDS_PRACTICE' || upper === 'REVIEW') return 'WEAK';
  if (upper === 'LOCKED') return 'NEW';
  return 'NEW';
}
