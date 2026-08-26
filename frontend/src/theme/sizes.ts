/**
 * Component sizing tokens (spec §29 / §30).
 *
 * Anything with a fixed pixel height that a child has to tap lives here so
 * that touch-target rules are enforced in one place instead of being
 * re-guessed per screen.
 */

/** WCAG/child-UX floor for anything tappable. */
export const MIN_TOUCH_TARGET = 48;

export const buttonSizes = {
  /** Compact — inline actions inside a card row. Still 44px tall. */
  sm: { height: 44, paddingHorizontal: 16, fontSize: 14, iconSize: 18, gap: 6 },
  /** Default. */
  md: { height: 52, paddingHorizontal: 22, fontSize: 16, iconSize: 20, gap: 8 },
  /** Hero CTA — "Continue Learning", "Start Activity". */
  lg: { height: 58, paddingHorizontal: 28, fontSize: 18, iconSize: 22, gap: 10 },
} as const;

export const iconButtonSizes = {
  sm: { size: 36, iconSize: 18 },
  md: { size: 44, iconSize: 22 },
  lg: { size: 52, iconSize: 26 },
} as const;

export const cardSizes = {
  /** Padding presets so cards feel generous and consistent (spec §5). */
  paddingCompact: 14,
  padding: 18,
  paddingRoomy: 22,
  /** Vertical rhythm between stacked cards. */
  gap: 14,
  /** Minimum height for a tappable list-style card. */
  minRowHeight: 72,
  /** Leading icon well inside subject / activity / reward cards. */
  iconWell: 52,
  iconWellSmall: 44,
  iconWellLarge: 64,
} as const;

export const headerSizes = {
  /** App header row height, excluding the safe-area inset. */
  height: 56,
  /** Taller variant used on the Home screen where the greeting sits inline. */
  heightTall: 68,
} as const;

export const bottomNavSizes = {
  /** Bar height excluding the bottom safe-area inset. */
  height: 62,
  iconSize: 24,
  labelSize: 11,
  /** Extra breathing room added to screen content so nothing hides behind. */
  contentInset: 96,
} as const;

export const roadmapSizes = {
  /**
   * Vertical distance between consecutive lesson nodes.
   *
   * This is now sized by the tallest card, not by taste. The current lesson's
   * card carries a CURRENT pill (~25px), a `cardTitle` line (23px) and a caption
   * (18px) inside 10px of vertical padding and a 2px border — about 90px. Cards
   * are centred in their row and rows are absolutely positioned, so a row
   * shorter than its card would let neighbours overlap.
   */
  rowHeight: 116,
  /**
   * Shorter row for a locked node. A locked stop carries no pill, no stars and a
   * one-line label, and a grade's worth of them at the full height turned the
   * journey into a wall of identical grey rows — twenty-seven lessons meant
   * roughly nine screens of nothing but padlocks. Nothing is hidden; the run just
   * compresses until it reaches something the child can do. 80 is the locked
   * card's ~62px plus clearance.
   */
  rowHeightLocked: 80,
  nodeCompleted: 48,
  nodeLocked: 44,
  /** The current lesson is deliberately the largest thing on the path. */
  nodeCurrent: 66,
  /** Horizontal swing of the curvy path either side of centre. */
  amplitude: 46,
  /**
   * Width of the drawn trail. Wide on purpose: at the 5px it shipped with, plus a
   * `1 14` dash, the journey read as a dotted leader line between list items
   * rather than as a path you walk along.
   */
  pathWidth: 14,
  /** Width of the soft underlay behind the trail. */
  pathUnderlayWidth: 28,
  /** The dashed centre marking down the middle of the trail. */
  pathDashWidth: 3,
  /** Gap between a node and the edge of its lesson card. */
  labelGap: 14,
} as const;

/**
 * The numbered step rail across the top of an activity — (1)—(2)—(3)—(4).
 *
 * Sizing is what decides whether this can ship at all. At 360px the activity
 * header leaves 328px of content width, so `maxSteps` circles at `node` plus
 * their connectors have to fit inside that: six 30px circles leave 148px for
 * five connectors, about 29px each, which still reads as a line between stops.
 * A seventh circle takes the connectors below 20px and the rail stops looking
 * like a path, so `ActivityHeader` falls back to a plain progress bar past this
 * count rather than shrinking the circles below a legible number.
 *
 * The circles are all one size on purpose. Enlarging the current step is the
 * obvious way to mark it, but it makes the rail lurch sideways as the child
 * advances; a ring in the activity's own colour marks position without moving
 * anything.
 */
export const stepRailSizes = {
  node: 30,
  /** Ring drawn around the step the child is on. */
  nodeRing: 3,
  /** The line joining two stops. */
  connector: 3,
  /** Breathing room either side of a connector. */
  gap: 4,
  /** Past this many activities the rail is replaced by a progress bar. */
  maxSteps: 6,
} as const;

export const progressSizes = {
  barHeight: 10,
  barHeightThin: 6,
  barHeightThick: 14,
  ringSize: 72,
  ringStroke: 8,
  /** The hero ring on an analytics card, where the ring *is* the content. */
  ringSizeLarge: 108,
  ringStrokeLarge: 10,
} as const;

export const badgeSizes = {
  sm: { height: 22, paddingHorizontal: 8, fontSize: 11, iconSize: 12 },
  md: { height: 28, paddingHorizontal: 10, fontSize: 12, iconSize: 14 },
  lg: { height: 34, paddingHorizontal: 13, fontSize: 14, iconSize: 16 },
} as const;

export const answerSizes = {
  /**
   * Answer tiles are deliberately large targets — a four-year-old missing the
   * option they meant to tap is a design bug, not a wrong answer.
   */
  minHeight: 88,
  /** Taller variant for options that carry a picture as well as a word. */
  minHeightMedia: 116,
  /** Gutter in the two-up answer grid. */
  gap: 12,
  /** The circled A / B / C / D marker in each tile's corner. */
  ordinal: 26,
} as const;

/**
 * The big round "tap me" control at the heart of Watch, Listen and Speak —
 * a play button, a speaker, a microphone. One set of sizes so the three
 * screens feel like the same app (spec §35).
 */
export const mediaOrbSizes = {
  md: { outer: 96, inner: 72, icon: 34 },
  lg: { outer: 116, inner: 88, icon: 42 },
} as const;

/**
 * Earned-star rows. Speak, Trace and every completion screen scored the child
 * out of three stars and each picked its own star size, so a 24px row on one
 * screen became a 40px row on the next.
 */
export const starSizes = {
  sm: 20,
  md: 28,
  /** The celebratory row on a completion screen. */
  lg: 40,
} as const;

/** The "I'm listening" waveform beside a microphone. */
export const waveSizes = {
  barWidth: 5,
  gap: 5,
  minHeight: 8,
  maxHeight: 34,
} as const;

/**
 * Caps for centred content on wide screens (spec §27).
 *
 * Mobile portrait is the primary target, and at 360–430px every one of these is
 * wider than the viewport, so they do nothing there. Their whole job is to stop
 * a column of cards from stretching to 900px on a tablet. They were previously
 * bare literals (`maxWidth: 520`, `420`, `720`) repeated across ten screens.
 */
export const layoutSizes = {
  /** Dialogs, celebration panels, calibration — a single focused surface. */
  dialog: 520,
  /** Prose and single-media screens: story reader, listen/speak prompts. */
  reading: 420,
  /** Parent-facing report screens, which are denser and take more width. */
  report: 720,
} as const;

export const sizes = {
  minTouchTarget: MIN_TOUCH_TARGET,
  button: buttonSizes,
  iconButton: iconButtonSizes,
  card: cardSizes,
  header: headerSizes,
  bottomNav: bottomNavSizes,
  roadmap: roadmapSizes,
  stepRail: stepRailSizes,
  progress: progressSizes,
  badge: badgeSizes,
  answer: answerSizes,
  mediaOrb: mediaOrbSizes,
  star: starSizes,
  wave: waveSizes,
  layout: layoutSizes,
} as const;

export type ButtonSizeToken = keyof typeof buttonSizes;
export type IconButtonSizeToken = keyof typeof iconButtonSizes;
export type BadgeSizeToken = keyof typeof badgeSizes;
export type MediaOrbSizeToken = keyof typeof mediaOrbSizes;
export type StarSizeToken = keyof typeof starSizes;
