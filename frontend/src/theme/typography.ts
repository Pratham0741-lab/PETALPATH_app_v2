import { TextStyle } from 'react-native';

/**
 * Type system (spec §6, redesign): a distinctive **playful‑premium** pairing —
 * **Fredoka** (rounded, characterful) for headings/display/buttons, **Nunito**
 * (clean, highly legible) for body and small text. Loaded via `expo-font` in
 * `App.tsx`; each weight is its own family name (custom fonts bake the weight in,
 * so presets set `fontFamily` and omit numeric `fontWeight` to avoid Android
 * picking the wrong face). Still no serif anywhere — this app teaches letter
 * recognition, so every letterform the child meets must be a plain rounded sans.
 */
const FRED = {
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};
const NUN = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
};
/** Back‑compat alias for any consumer reading `families.rounded` directly. */
const rounded = NUN.semibold;

const weights = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  black: '900' as TextStyle['fontWeight'],
};

const sizes = {
  caption: 12,
  small: 14,
  body: 16,
  cardTitle: 20,
  sectionTitle: 24,
  largeTitle: 34,
  display: 48,
  button: 16,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 34,
  huge: 48,
};

/**
 * Ready-made text styles. Prefer these over re-declaring fontFamily/size/
 * weight triplets per screen (spec §29).
 *
 * One family throughout, and deliberately no serif anywhere. That is a subject
 * decision rather than a taste one: this app teaches letter recognition, and a
 * child who is still learning that a `C` is a `C` should never meet a serifed
 * or high-contrast letterform inside the product that is teaching it. If a
 * future pass reaches for a display serif, this is the reason not to.
 */
const presets = {
  /**
   * The one big thing on a screen. Used at most once per screen, for the word or
   * number that *is* the screen — the letter being taught, "Amazing!", a star
   * total. Everything shipped before this sat between 12.5 and 24px, so no
   * screen had a focal point; that flatness is what read as bland.
   *
   * 40 rather than the 48 that `sizes.display` has always declared (and which
   * nothing ever read): at 48 on a 360px screen, "Amazing!" does not fit on one
   * line.
   */
  hero: {
    fontFamily: FRED.bold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  } as TextStyle,
  /** Big screen-level greeting, e.g. "Hi, Aanya!" */
  display: {
    fontFamily: FRED.bold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.4,
  } as TextStyle,
  /** Screen / page title. */
  title: {
    fontFamily: FRED.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  } as TextStyle,
  /** Section heading above a group of cards. */
  section: {
    fontFamily: FRED.semibold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
  } as TextStyle,
  /** Card headline. */
  cardTitle: {
    fontFamily: FRED.semibold,
    fontSize: 17,
    lineHeight: 23,
  } as TextStyle,
  /** Default running text. */
  body: {
    fontFamily: NUN.semibold,
    fontSize: 15,
    lineHeight: 22,
  } as TextStyle,
  /** Supporting text under a title. */
  subtle: {
    fontFamily: NUN.semibold,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,
  /** Small metadata — counts, durations. */
  caption: {
    fontFamily: NUN.bold,
    fontSize: 12.5,
    lineHeight: 17,
  } as TextStyle,
  /** Uppercase eyebrow above a title. */
  eyebrow: {
    fontFamily: NUN.extrabold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  } as TextStyle,
  /**
   * A label sitting ON an illustration rather than on a surface — the caption
   * inside a scene band, a word over the grass.
   *
   * Not `eyebrow`: its 1.1 tracking is tuned for a label floating in white space,
   * and against a filled scene colour that much air between letters reads
   * spindly. This is bigger, tighter and still heavy enough to hold.
   */
  sceneLabel: {
    fontFamily: NUN.extrabold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,
  /** Button label. */
  button: {
    fontFamily: FRED.semibold,
    fontSize: 16,
    letterSpacing: 0.2,
  } as TextStyle,
  /** Bottom-navigation label. */
  navLabel: {
    fontFamily: NUN.bold,
    fontSize: 11,
    lineHeight: 14,
  } as TextStyle,
  /** Numeric readouts — star counts, XP. */
  stat: {
    fontFamily: FRED.bold,
    fontSize: 22,
    lineHeight: 27,
  } as TextStyle,
};

export const typography = {
  /** `display` = Fredoka (headings), `body` = Nunito (text). `rounded` kept for back‑compat. */
  families: { rounded, display: FRED, body: NUN },
  sizes,
  weights,
  lineHeights: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 28,
    xxl: 32,
    xxxl: 40,
  },
  presets,
};

export type TextPreset = keyof typeof presets;
