/**
 * PetalPath colour tokens.
 *
 * Design rules baked into this file (see the redesign spec):
 *  - Pink (#F43F72) is the PRIMARY action / brand colour.
 *  - Purple (#8064D8) is SECONDARY only: selected states, progress, the
 *    "current lesson" marker. The app must not read as an all-purple app.
 *  - The background is a warm off-white pink (#FFF8FA); surfaces are pure
 *    white or the warmer #FFFDFC. No heavy gradients.
 *
 * Every key that existed before is still present so no consumer breaks.
 */

export const lightColors = {
  // ---------------------------------------------------------------- brand
  /** Pink. Primary CTAs, active nav, brand marks. */
  primary: '#F43F72',
  /** Pale pink. Backgrounds/wells only — never a text colour. */
  primaryLight: '#FFE4EC',
  /** Deep pink. Text/icons sitting on primaryLight, and pressed states. */
  primaryDark: '#C42553',
  /** Purple. Selected states, progress, secondary emphasis. */
  secondary: '#8064D8',
  secondaryLight: '#EFE9FC',
  /** Text/icons sitting ON secondaryLight. See successDark. */
  secondaryDark: '#5C41AF',
  /** Yellow. Stars, rewards, streaks. */
  accent: '#F6C94A',

  // ------------------------------------------------------------- semantic
  success: '#8FC27A',
  successLight: '#E7F2E1',
  /**
   * Text/icons sitting ON successLight. The mid green is only ~2:1 against its
   * own tint, so a "Done"/"Improving" label drawn in `success` is unreadable —
   * these are the darkened pair that clears 4.5:1 (§30).
   */
  successDark: '#3F6B2F',
  warning: '#EE8C3C',
  warningLight: '#FDEBDC',
  /** Text/icons sitting ON warningLight. See successDark. */
  warningDark: '#A85C1E',
  error: '#E2544C',
  errorLight: '#FBE3E1',
  /** Text/icons sitting ON errorLight. See successDark. */
  errorDark: '#A63A33',

  // --------------------------------------------------------- backgrounds
  background: '#FFF8FA',
  backgroundSecondary: '#FFFDFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#FFFDFC',
  card: '#FFFFFF',

  // ------------------------------------------------------------- outlines
  border: '#EDE4DE',
  borderLight: '#F6EFEB',
  divider: '#EDE4DE',

  // ----------------------------------------------------------------- text
  text: '#302C2A',
  textPrimary: '#302C2A',
  textSecondary: '#77716D',
  textMuted: '#9A938E',
  textInverse: '#FFFFFF',
  textLink: '#F43F72',

  // ---------------------------------------------------------------- misc
  overlay: 'rgba(48,44,42,0.45)',
  shadow: 'rgba(48,44,42,0.10)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
  skeleton: '#F1E8E3',
  skeletonHighlight: '#FBF5F2',
  sidebar: '#FFFFFF',
  sidebarDark: '#FFFDFC',

  // ------------------------------------------------------------- palette
  // Named hues used directly by illustrations, subject cards and activity
  // identity. Keep these in step with `activityColors` below.
  pink: '#F43F72',
  pinkSoft: '#FFD3E0',
  purple: '#8064D8',
  purpleSoft: '#DFD5F7',
  /** Text/icons sitting ON purpleSoft or secondaryLight. */
  purpleDark: '#5C41AF',
  blue: '#4F91D9',
  blueSoft: '#D7E7F7',
  /** Text/icons sitting ON blueSoft — the mid blue fails contrast on its own tint. */
  blueDark: '#2F6BA8',
  skyBlue: '#9CC6EC',
  green: '#8FC27A',
  greenSoft: '#D8EACE',
  leafGreen: '#6FA85B',
  yellow: '#F6C94A',
  yellowSoft: '#FCEEC4',
  orange: '#EE8C3C',
  coral: '#F4776E',
  peach: '#FBD6C4',
  lavender: '#B9A6EE',
  brown: '#5A4B45',

  /**
   * The dashed line a child traces over. Deliberately low-contrast: it has to
   * read as a hint underneath their own stroke, not compete with it.
   */
  traceGuide: '#DCD2CB',

  // --------------------------------------------------------------- scene
  /*
   * The scene palette: four tones that exist ONLY to draw the hand-built SVG
   * illustrations (`SceneBand`, `GardenScene`, activity backdrops). They are the
   * ground the app stands on, not part of the UI palette.
   *
   * Why these four and not more: the redesign brief fixes pink as primary and
   * purple as secondary, so the app did not need new *brand* colour — it needed
   * colour it could paint a large area with. Every green above is either a mid
   * (`green`, `leafGreen`) that is too saturated to fill half a screen, or a
   * pastel tint (`greenSoft`) that reads as a UI wash rather than as grass. The
   * only brown is `brown`, which is a text brown. Two further tones were drafted
   * and cut because `leafGreen` and `blueSoft` already covered them.
   *
   * Rule: never use these for type, borders, icons or any interactive surface.
   * `sceneInk` in particular is not a text colour — use `text`.
   */
  /** Scene ceiling. Barely-there blue; the palest blue above is `blueSoft`, which is ~1.5 steps darker and reads as a tinted panel. */
  sky: '#EAF4FB',
  /** Sunlit grass. Sits between `greenSoft` (grey-green tint) and `green` (too loud full-bleed). */
  meadow: '#CFE7B8',
  /** Warm earth for trails, pots and stepping stones. `brown` is a near-neutral text brown and cannot do this job. */
  soil: '#C79A6B',
  /** Outline weight for illustrations. Warmer and a shade lighter than `text`, because a 2px drawn line reads harsher than type at the same value. */
  sceneInk: '#3D3330',
};

export const darkColors = {
  // ---------------------------------------------------------------- brand
  primary: '#FF6B93',
  primaryLight: '#4A2334',
  primaryDark: '#FFB3C6',
  secondary: '#A28BE6',
  secondaryLight: '#332A4D',
  secondaryDark: '#C0AEF3',
  accent: '#F6C94A',

  // ------------------------------------------------------------- semantic
  success: '#9FCE8C',
  successLight: '#2A3A26',
  /**
   * Same role as in the light palette — the colour that reads ON *Light — which
   * inverts here, because on dark the tint is the dark thing. The name tracks
   * the role, not the lightness, so a component can use it unconditionally.
   */
  successDark: '#B7DCA6',
  warning: '#F0A05C',
  warningLight: '#402C1B',
  warningDark: '#F3BC8B',
  error: '#EF7168',
  errorLight: '#402220',
  errorDark: '#F7A9A2',

  // --------------------------------------------------------- backgrounds
  background: '#1C1719',
  backgroundSecondary: '#231D20',
  surface: '#282124',
  surfaceSecondary: '#312A2D',
  card: '#282124',

  // ------------------------------------------------------------- outlines
  border: '#3D3439',
  borderLight: '#4A4045',
  divider: '#3D3439',

  // ----------------------------------------------------------------- text
  text: '#F6EFEC',
  textPrimary: '#F6EFEC',
  textSecondary: '#BEB4B0',
  textMuted: '#8F8580',
  textInverse: '#1C1719',
  textLink: '#FF6B93',

  // ---------------------------------------------------------------- misc
  overlay: 'rgba(0,0,0,0.6)',
  shadow: 'rgba(0,0,0,0.4)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
  skeleton: '#352E31',
  skeletonHighlight: '#443B3F',
  sidebar: '#282124',
  sidebarDark: '#1C1719',

  // ------------------------------------------------------------- palette
  pink: '#FF6B93',
  pinkSoft: '#4A2334',
  purple: '#A28BE6',
  purpleSoft: '#332A4D',
  purpleDark: '#C0AEF3',
  blue: '#6FA8E5',
  blueSoft: '#20303F',
  blueDark: '#A9CDF0',
  skyBlue: '#9CC6EC',
  green: '#9FCE8C',
  greenSoft: '#2A3A26',
  leafGreen: '#7FBA6A',
  yellow: '#F6C94A',
  yellowSoft: '#3D3320',
  orange: '#F0A05C',
  coral: '#F4776E',
  peach: '#4A342A',
  lavender: '#C0AEF3',
  brown: '#8A7168',

  /** See the light-theme note; lifted so it stays visible on a dark canvas. */
  traceGuide: '#4A4144',

  // --------------------------------------------------------------- scene
  /*
   * Same four roles as the light scene palette, re-pitched for a dark canvas.
   * As with `successDark`, the names track the ROLE and not the lightness — a
   * scene component can reference `sceneInk` unconditionally and get whichever
   * value draws a visible outline on the current ground.
   */
  sky: '#1F2C38',
  meadow: '#2F4A28',
  soil: '#6B4F35',
  /** Inverts: the outline that reads against a dark ground is a light one. */
  sceneInk: '#EFE6E2',
};

/**
 * Per-activity colour identity (spec §15). Colour is never the only signal —
 * each activity also carries its own icon and label.
 *   watch → pink/red · listen → blue · speak → purple
 *   match → yellow/orange · trace → green
 */
export const activityColors = {
  watch: { main: '#F43F72', soft: '#FFE4EC' },
  video: { main: '#F43F72', soft: '#FFE4EC' },
  listen: { main: '#4F91D9', soft: '#D7E7F7' },
  speak: { main: '#8064D8', soft: '#EFE9FC' },
  match: { main: '#EE8C3C', soft: '#FDEBDC' },
  drag_drop: { main: '#EE8C3C', soft: '#FDEBDC' },
  trace: { main: '#8FC27A', soft: '#D8EACE' },
  write: { main: '#8FC27A', soft: '#D8EACE' },
  stories: { main: '#8064D8', soft: '#EFE9FC' },
  camera: { main: '#4F91D9', soft: '#D7E7F7' },
  locked: { main: '#9A938E', soft: '#F1E8E3' },
} as const;

export type ActivityColorKey = keyof typeof activityColors;

/** Safe lookup for the activity palette; unknown types fall back to brand. */
export const getActivityColor = (key: string) =>
  (activityColors as Record<string, { main: string; soft: string }>)[key] ?? {
    main: lightColors.primary,
    soft: lightColors.primaryLight,
  };

export const colors = lightColors;
