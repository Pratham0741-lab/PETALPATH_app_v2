import { TextStyle, Platform } from 'react-native';

/**
 * Friendly, rounded sans-serif throughout (spec §6). Nothing below 12px, and
 * anything carrying meaning is at least semibold — no thin text for important
 * information.
 */
const rounded = Platform.select({
  ios: 'System',
  android: 'sans-serif-rounded',
  web: 'Nunito, Baloo 2, system-ui, -apple-system, sans-serif',
  default: 'System',
});

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
    fontFamily: rounded,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: weights.black,
    letterSpacing: -0.8,
  } as TextStyle,
  /** Big screen-level greeting, e.g. "Hi, Aanya!" */
  display: {
    fontFamily: rounded,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: weights.black,
    letterSpacing: -0.4,
  } as TextStyle,
  /** Screen / page title. */
  title: {
    fontFamily: rounded,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: weights.black,
    letterSpacing: -0.3,
  } as TextStyle,
  /** Section heading above a group of cards. */
  section: {
    fontFamily: rounded,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: weights.bold,
    letterSpacing: -0.2,
  } as TextStyle,
  /** Card headline. */
  cardTitle: {
    fontFamily: rounded,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: weights.bold,
  } as TextStyle,
  /** Default running text. */
  body: {
    fontFamily: rounded,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: weights.medium,
  } as TextStyle,
  /** Supporting text under a title. */
  subtle: {
    fontFamily: rounded,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: weights.medium,
  } as TextStyle,
  /** Small metadata — counts, durations. */
  caption: {
    fontFamily: rounded,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: weights.bold,
  } as TextStyle,
  /** Uppercase eyebrow above a title. */
  eyebrow: {
    fontFamily: rounded,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: weights.black,
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
    fontFamily: rounded,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: weights.black,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,
  /** Button label. */
  button: {
    fontFamily: rounded,
    fontSize: 16,
    fontWeight: weights.black,
    letterSpacing: 0.1,
  } as TextStyle,
  /** Bottom-navigation label. */
  navLabel: {
    fontFamily: rounded,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: weights.bold,
  } as TextStyle,
  /** Numeric readouts — star counts, XP. */
  stat: {
    fontFamily: rounded,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: weights.black,
  } as TextStyle,
};

export const typography = {
  families: { rounded },
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
