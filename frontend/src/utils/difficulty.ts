/**
 * Curriculum difficulty helpers.
 *
 * The curriculum stores difficulty as a 1-5 integer on every node, but four
 * separate places in the UI wanted a word and a colour and each invented its own
 * mapping — three of which switched on the strings 'EASY' / 'MEDIUM' / 'HARD'
 * that the roadmap payload has never actually carried. Every one of those
 * mappings therefore fell through to its default, so easy and hard lessons were
 * drawn identically. Banding lives here so all of them agree.
 *
 * Like the rest of `utils/`, this stays theme-free: it names a colour role and
 * lets the caller resolve it against `colors`, rather than pulling the theme
 * into a pure helper (`categoryDetails.ts` follows the same rule).
 */

/** Key into the `colors` palette. */
export type DifficultyTone = 'green' | 'yellow' | 'coral';

export interface DifficultyBand {
  /**
   * One word, deliberately. These land in `StatGrid` tiles roughly 76px wide, so
   * anything longer gets ellipsized rather than read.
   */
  label: string;
  tone: DifficultyTone;
}

/**
 * Bands a 1-5 curriculum difficulty into the three levels the UI shows.
 *
 * Returns `null` when the value is absent so callers hide the badge instead of
 * rendering an empty pill — which is exactly what the Journey roadmap did on
 * every unlocked lesson for as long as the roadmap projection omitted the field.
 * Guarding on `typeof` rather than truthiness keeps a legitimate 0 from being
 * mistaken for "missing".
 */
export function difficultyBand(difficulty?: number | null): DifficultyBand | null {
  if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) return null;
  if (difficulty >= 4) return { label: 'Hard', tone: 'coral' };
  if (difficulty === 3) return { label: 'Medium', tone: 'yellow' };
  return { label: 'Easy', tone: 'green' };
}
