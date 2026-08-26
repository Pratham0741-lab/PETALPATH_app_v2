/**
 * Projects an engine evaluation onto `KnowledgeState` — the store the unlock gate
 * reads.
 *
 * Two tables held mastery and nothing kept them in step: the adaptive engine
 * wrote `SkillHealth.masteryScore`, while the app's roadmap, the lesson-access
 * guard and the analytics screens all read `KnowledgeState.mastery`, which only
 * the force-complete and assessment paths ever wrote. Whatever the engine
 * concluded was invisible to the gate.
 *
 * Both stores are kept, because they answer different questions:
 *
 * - `SkillHealth.masteryScore` is the **live** score. It decays, and it decides
 *   when a skill comes back for review.
 * - `KnowledgeState.mastery` is the **high-water mark**, and only it gates. A
 *   lesson the child has already opened must not close again overnight because
 *   retention decayed — decay schedules practice, it does not confiscate
 *   progress.
 *
 * This module is the one place the projection happens, so both completion paths
 * write identically.
 */

import type { Prisma } from '@prisma/client';
import { KnowledgeStateType, MasteryState } from '../../shared/enums.js';
import type { LessonEvidence, ModalitySignal } from './lesson-evidence.js';

/**
 * The engine's five-band mastery vocabulary mapped onto the six-state
 * classification `KnowledgeState.state` uses. Two vocabularies for one idea is
 * not worth a third table, but they do have to agree.
 */
export function knowledgeStateFor(masteryState: string): KnowledgeStateType {
  switch (masteryState) {
    case MasteryState.MASTERED:
      return KnowledgeStateType.MASTERED;
    case MasteryState.STRONG:
      return KnowledgeStateType.STABLE;
    case MasteryState.WEAK:
      return KnowledgeStateType.NEEDS_PRACTICE;
    case MasteryState.LEARNING:
      return KnowledgeStateType.LEARNING;
    default:
      return KnowledgeStateType.NEW;
  }
}

/**
 * Fills `KnowledgeState.modalityCoverage`, a column the schema has always had
 * and nothing has ever written. It is what lets a parent (or a later adaptation
 * pass) see *which* part of a lesson went unfinished.
 */
export function modalityCoverageJson(signals: readonly ModalitySignal[]): Record<string, string> {
  const coverage: Record<string, string> = {};
  for (const signal of signals) {
    if (!signal.expected && !signal.attempted) continue;
    coverage[signal.modality] = signal.completed
      ? 'COMPLETED'
      : signal.attempted
        ? 'ATTEMPTED'
        : 'PENDING';
  }
  return coverage;
}

export interface MasteryProjectionInput {
  readonly childId: string;
  readonly topicId: string;
  readonly evidence: LessonEvidence;
  readonly signals: readonly ModalitySignal[];
  /** The engine's verdict, or `null` when no `Skill` row exists to score. */
  readonly masteryScore: number | null;
  readonly masteryState: string | null;
  /** 0-100 from the engine; stored as 0-1 because that is this column's scale. */
  readonly confidenceScore: number | null;
  readonly now: Date;
}

export interface MasteryProjection {
  /** The high-water mark actually written. */
  readonly mastery: number;
  readonly previousMastery: number | null;
  readonly state: KnowledgeStateType;
}

/** Accuracy at or above this reads as a successful pass for streak purposes. */
const PASS_ACCURACY = 60;

/**
 * Upserts the child's `KnowledgeState` for one topic from an engine evaluation.
 */
export async function projectMasteryToKnowledgeState(
  input: MasteryProjectionInput,
  client: Prisma.TransactionClient
): Promise<MasteryProjection> {
  const { childId, topicId, evidence, signals, now } = input;

  const previous = await client.knowledgeState.findUnique({
    where: { childId_topicId: { childId, topicId } },
  });

  const previousMastery: number | null = previous ? previous.mastery : null;
  const masteryState = input.masteryState ?? MasteryState.LEARNING;
  const mastery =
    input.masteryScore === null
      ? (previousMastery ?? 0)
      : Math.max(previousMastery ?? 0, input.masteryScore);

  const passed = evidence.accuracy >= PASS_ACCURACY;
  const data = {
    state: knowledgeStateFor(masteryState),
    // 0-1 here, unlike `mastery`'s 0-100. An easy column to write a 100 into.
    confidence: Math.min(1, Math.max(0, (input.confidenceScore ?? 0) / 100)),
    mastery,
    modalityCoverage: modalityCoverageJson(signals) as Prisma.InputJsonValue,
    lastPracticedAt: now,
    lastTransitionAt: now,
    transitionReason:
      input.masteryScore === null
        ? 'lesson-complete:no-skill-row'
        : `lesson-complete:${masteryState}:${Math.round(input.masteryScore)}`,
    totalAttempts: (previous?.totalAttempts ?? 0) + evidence.attempts,
    correctAttempts: (previous?.correctAttempts ?? 0) + (passed ? 1 : 0),
    incorrectAttempts: (previous?.incorrectAttempts ?? 0) + (passed ? 0 : 1),
    retryCount: (previous?.retryCount ?? 0) + evidence.retries,
    hintUsage: (previous?.hintUsage ?? 0) + evidence.helpRequests,
    streak: passed ? (previous?.streak ?? 0) + 1 : 0,
    averageResponseTimeMs: Math.round(evidence.responseTime * 1000),
  };

  await client.knowledgeState.upsert({
    where: { childId_topicId: { childId, topicId } },
    update: data,
    create: { childId, topicId, ...data },
  });

  return { mastery, previousMastery, state: data.state };
}
