import { colors } from './colors';

/**
 * Per‑screen accent colour, matched to each tab's scene background. Pink stays
 * the primary *button* colour app‑wide; this only tints per‑screen accents
 * (header eyebrow/subtitle, and — as the accent system extends — icon wells,
 * section eyebrows and chips) so each screen has its own colour identity.
 */
export const SCREEN_ACCENTS = {
  home: colors.blue,
  explore: colors.leafGreen,
  camera: colors.blue,
  mentors: colors.leafGreen,
  rewards: colors.orange,
  profile: colors.purple,
} as const;
