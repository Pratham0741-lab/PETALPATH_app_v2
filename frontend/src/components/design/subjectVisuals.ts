import { colors } from '../../theme';
import { PetalIconName } from '../icons';

/**
 * Subject visual identity (spec §14).
 *
 * Subject names arrive from the API, so this matches on substrings rather
 * than exact strings — the backend seeds "Environmental Studies / General
 * Awareness" and "Social-Emotional Learning & Life Skills", and those names
 * shouldn't be duplicated as magic constants in the UI.
 *
 * Order matters: the first matching rule wins, so the more specific rules
 * ("fine motor" before "math") come first.
 */

export interface SubjectVisual {
  icon: PetalIconName;
  color: string;
  soft: string;
}

const RULES: Array<{ match: RegExp; visual: SubjectVisual }> = [
  {
    match: /hindi|हिंदी/i,
    visual: { icon: 'subjectHindi', color: colors.orange, soft: colors.warningLight },
  },
  {
    match: /english|language|literacy|phonic|reading/i,
    visual: { icon: 'subjectEnglish', color: colors.blue, soft: colors.blueSoft },
  },
  {
    match: /environment|general\s*awareness|\bevs\b|world|nature/i,
    visual: { icon: 'subjectEvs', color: colors.green, soft: colors.greenSoft },
  },
  {
    match: /fine\s*motor|cognitive|motor|puzzle|dexterity/i,
    visual: { icon: 'subjectMotor', color: colors.purple, soft: colors.secondaryLight },
  },
  {
    match: /social|emotional|life\s*skill|\bsel\b|feeling/i,
    visual: { icon: 'subjectSel', color: colors.coral, soft: colors.primaryLight },
  },
  {
    match: /math|number|count|numeracy|arithmetic/i,
    visual: { icon: 'subjectMaths', color: colors.primary, soft: colors.primaryLight },
  },
];

const FALLBACK: SubjectVisual = {
  icon: 'book',
  color: colors.primary,
  soft: colors.primaryLight,
};

/** Rotating palette so unmatched subjects still look deliberate, not broken. */
const CYCLE: SubjectVisual[] = [
  { icon: 'book', color: colors.blue, soft: colors.blueSoft },
  { icon: 'sparkle', color: colors.purple, soft: colors.secondaryLight },
  { icon: 'seedling', color: colors.green, soft: colors.greenSoft },
  { icon: 'star', color: colors.orange, soft: colors.warningLight },
  { icon: 'heart', color: colors.primary, soft: colors.primaryLight },
];

/**
 * @param name  Subject name from the API.
 * @param index Position in the list; used only when nothing matches, so the
 *              cards still get distinct colours instead of all going pink.
 */
export const getSubjectVisual = (name?: string | null, index = 0): SubjectVisual => {
  if (!name) return FALLBACK;
  const hit = RULES.find((r) => r.match.test(name));
  if (hit) return hit.visual;
  return CYCLE[index % CYCLE.length] ?? FALLBACK;
};

export default getSubjectVisual;
