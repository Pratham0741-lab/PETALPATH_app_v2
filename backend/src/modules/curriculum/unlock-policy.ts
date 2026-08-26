/**
 * One unlock policy.
 *
 * There were two, in the same file, disagreeing. `calculateUnlockRatio` took a
 * weighted average of the parent skills' `SkillHealth.masteryScore` and unlocked
 * at >= 70, giving partial credit. `isLessonUnlocked` required *every*
 * prerequisite's `KnowledgeState.mastery` to reach the node's `required_score`
 * (80) with no partial credit at all, reading a different table. The adaptive
 * engine wrote only the first table; the app's roadmap read only the second.
 *
 * This module is the single predicate both now call. It keeps the weighted
 * average — a child who is strong on three prerequisites and shaky on a fourth
 * should keep moving — and adds a per-prerequisite floor so that one badly
 * missed prerequisite cannot be averaged away by its siblings.
 *
 * Pure and dependency-light (config only) so the reachability probe can execute
 * it without a database.
 */

import { engineConfig } from '../../shared/config/engine.config.js';

export type UnlockReason =
  | 'FIRST_LESSON'
  | 'NO_PREREQUISITES'
  | 'PREREQUISITES_MET'
  | 'SEQUENTIAL_PREVIOUS_COMPLETE'
  | 'PREREQUISITE_INCOMPLETE'
  | 'PREREQUISITE_BELOW_FLOOR'
  | 'WEIGHTED_SCORE_BELOW_THRESHOLD'
  | 'LESSON_NOT_IN_GRADE';

export interface PrerequisiteEvidence {
  readonly skillId: string;
  /** The prerequisite lesson has been finished. */
  readonly completed: boolean;
  /**
   * 0-100 mastery for the prerequisite. This should be the **high-water mark**,
   * not the live decaying score: a lesson the child already opened must not
   * re-lock overnight because retention decayed. Decay drives reviews, not gates.
   */
  readonly mastery: number;
  /** Relative importance; defaults to 1. */
  readonly weight?: number;
}

export interface UnlockDecision {
  readonly unlocked: boolean;
  readonly reason: UnlockReason;
  /** The weighted prerequisite average actually computed, 0-100. */
  readonly weightedScore: number;
  /** Prerequisites responsible for a refusal, in declaration order. */
  readonly blockingSkillIds: readonly string[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export interface UnlockPolicyOptions {
  readonly weightedThreshold?: number;
  readonly perPrerequisiteFloor?: number;
  readonly requirePrerequisiteCompletion?: boolean;
}

/**
 * Decides whether a lesson is open, given evidence about its prerequisites.
 *
 * `prerequisites` empty means unconditionally open — sequencing for nodes with
 * no declared prerequisites is the caller's business (see
 * `isLessonUnlocked`'s previous-node fallback).
 */
export function evaluateUnlock(
  prerequisites: readonly PrerequisiteEvidence[],
  options: UnlockPolicyOptions = {}
): UnlockDecision {
  const cfg = engineConfig.unified.unlock;
  const threshold = options.weightedThreshold ?? cfg.weightedThreshold;
  const floor = options.perPrerequisiteFloor ?? cfg.perPrerequisiteFloor;
  const requireCompletion = options.requirePrerequisiteCompletion ?? cfg.requirePrerequisiteCompletion;

  if (prerequisites.length === 0) {
    return { unlocked: true, reason: 'NO_PREREQUISITES', weightedScore: 100, blockingSkillIds: [] };
  }

  let weightSum = 0;
  let scoreSum = 0;
  const incomplete: string[] = [];
  const belowFloor: string[] = [];

  for (const prereq of prerequisites) {
    const weight = prereq.weight !== undefined && prereq.weight > 0 ? prereq.weight : 1;
    const mastery = clamp(prereq.mastery, 0, 100);
    weightSum += weight;
    scoreSum += mastery * weight;

    if (requireCompletion && !prereq.completed) {
      incomplete.push(prereq.skillId);
    }
    if (mastery < floor) {
      belowFloor.push(prereq.skillId);
    }
  }

  const weightedScore = weightSum > 0 ? clamp(scoreSum / weightSum, 0, 100) : 0;

  // Report the most actionable obstacle first: "you haven't done this yet" is
  // more useful to a child than "your average is 4 points short".
  if (incomplete.length > 0) {
    return { unlocked: false, reason: 'PREREQUISITE_INCOMPLETE', weightedScore, blockingSkillIds: incomplete };
  }
  if (belowFloor.length > 0) {
    return { unlocked: false, reason: 'PREREQUISITE_BELOW_FLOOR', weightedScore, blockingSkillIds: belowFloor };
  }
  if (weightedScore < threshold) {
    return {
      unlocked: false,
      reason: 'WEIGHTED_SCORE_BELOW_THRESHOLD',
      weightedScore,
      blockingSkillIds: prerequisites
        .filter((p) => clamp(p.mastery, 0, 100) < threshold)
        .map((p) => p.skillId),
    };
  }

  return { unlocked: true, reason: 'PREREQUISITES_MET', weightedScore, blockingSkillIds: [] };
}

/**
 * A short, honest explanation of a gate, for the padlock the child taps.
 *
 * `titleOf` resolves a lesson id to its title; ids are meaningless to a child,
 * and "Access denied: lesson is currently locked" — the current API message —
 * tells them nothing they can act on.
 */
export function describeUnlockDecision(
  decision: UnlockDecision,
  titleOf?: (skillId: string) => string | undefined
): string {
  const names = decision.blockingSkillIds
    .map((id) => titleOf?.(id) ?? id)
    .slice(0, 2);
  const list = names.length === 2 ? `${names[0]} and ${names[1]}` : names[0];

  switch (decision.reason) {
    case 'FIRST_LESSON':
    case 'NO_PREREQUISITES':
    case 'PREREQUISITES_MET':
    case 'SEQUENTIAL_PREVIOUS_COMPLETE':
      return 'Ready to start';
    case 'PREREQUISITE_INCOMPLETE':
      return list ? `Finish ${list} first` : 'Finish the earlier lesson first';
    case 'PREREQUISITE_BELOW_FLOOR':
      return list ? `Practice ${list} once more to open this` : 'A little more practice opens this';
    case 'WEIGHTED_SCORE_BELOW_THRESHOLD':
      return list ? `Practice ${list} to open this` : 'A little more practice opens this';
    case 'LESSON_NOT_IN_GRADE':
      return 'This lesson is not part of the current grade';
    default:
      return 'Not open yet';
  }
}
