import { ImageSourcePropType } from 'react-native';

/**
 * Subject emblem illustrations for the Explore garden cards. Matched by keyword
 * against the subject name so the mapping survives the long CBSE subject titles
 * ("Environmental Studies / General Awareness", "Fine Motor & Cognitive Skills",
 * "Social‑Emotional Learning & Life Skills"). A subject with no match falls back
 * to the drawn icon in `GardenPatch`.
 */
const EMBLEMS: ReadonlyArray<{ keyword: string; image: ImageSourcePropType }> = [
  { keyword: 'english', image: require('./subj_english.png') },
  { keyword: 'math', image: require('./subj_maths.png') },
  { keyword: 'numeracy', image: require('./subj_maths.png') },
  { keyword: 'number', image: require('./subj_maths.png') },
  { keyword: 'hindi', image: require('./subj_hindi.png') },
  { keyword: 'environment', image: require('./subj_evs.png') },
  { keyword: 'awareness', image: require('./subj_evs.png') },
  { keyword: 'evs', image: require('./subj_evs.png') },
  { keyword: 'motor', image: require('./subj_motor.png') },
  { keyword: 'cognitive', image: require('./subj_motor.png') },
  { keyword: 'social', image: require('./subj_sel.png') },
  { keyword: 'emotional', image: require('./subj_sel.png') },
];

/** The emblem for a subject name, or null if none (caller draws its icon fallback). */
export function getSubjectEmblem(name: string): ImageSourcePropType | null {
  const lower = (name ?? '').toLowerCase();
  for (const { keyword, image } of EMBLEMS) {
    if (lower.includes(keyword)) return image;
  }
  return null;
}
