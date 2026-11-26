/**
 * A lesson's language, and whether its speaking activity is scored.
 *
 * The language comes from the curriculum's structured `curriculum.subject`
 * field (curriculum/cbse/*.json, loaded by CurriculumLoader; lesson ids are the
 * curriculum node ids), never from the lesson or module title: 36 Pre-Nursery
 * Hindi lessons sit in modules whose titles don't say "Hindi".
 *
 * Hindi speaking activities are unscored practice while
 * SPEAK_HINDI_SCORING_ENABLED is false (the default): the app shows the word
 * and a "Say it out loud" prompt without speech recognition, nothing is
 * recorded, and the activity is neither required for nor counted in the
 * lesson's completion, stars or mastery evidence.
 */
import { env } from '../../config/env.js';
import { normalizeActivityType } from './activity-type-normalizer.js';

export type LessonLanguage = 'hi' | 'en';

/** The part of a curriculum node this needs. */
export interface LanguageNode {
  readonly curriculum?: { readonly subject?: string } | null;
}

const SUBJECT_LANGUAGE: Readonly<Record<string, LessonLanguage>> = { Hindi: 'hi' };

/** 'hi' for Hindi lessons, 'en' for every other subject (and unknown nodes). */
export function lessonLanguage(node: LanguageNode | null | undefined): LessonLanguage {
  return SUBJECT_LANGUAGE[node?.curriculum?.subject ?? ''] ?? 'en';
}

/** Does this lesson's speaking activity count (recorded, required, scored)? */
export function isSpeakScored(
  node: LanguageNode | null | undefined,
  hindiScoringEnabled: boolean = env.SPEAK_HINDI_SCORING_ENABLED
): boolean {
  return lessonLanguage(node) !== 'hi' || hindiScoringEnabled;
}

/** Is this activity in this lesson scored? Only speaking can be unscored. */
export function isActivityScored(
  activityType: string,
  node: LanguageNode | null | undefined,
  hindiScoringEnabled: boolean = env.SPEAK_HINDI_SCORING_ENABLED
): boolean {
  return normalizeActivityType(activityType) !== 'speak' || isSpeakScored(node, hindiScoringEnabled);
}
