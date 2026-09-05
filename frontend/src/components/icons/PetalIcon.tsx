import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  House, Compass, Camera, UsersThree, Gift, User,
  PlayCircle, Ear, Microphone, PuzzlePiece, PencilSimple,
  Star, Heart, Lock, Check, Flame, Coins, Trophy, Medal, Sparkle, Plant,
  SpeakerHigh, SpeakerSlash, Play, Pause, ArrowClockwise, CameraRotate,
  ArrowCounterClockwise, Eraser, CaretLeft, CaretRight, ArrowUp, ArrowDown, X,
  Gear, ShieldCheck, Bell, ChartBar, Clock, CalendarBlank, BookOpen, Plus,
  MagnifyingGlass, SignOut, Trash, Info, Warning, Eye, EyeSlash,
  TextAa, Globe, Hand, Translate, MathOperations, Smiley,
} from 'phosphor-react-native';
import { colors, iconSizes } from '../../theme';

/**
 * PetalPath icon set (spec §7) — now backed by the open‑source **Phosphor** pack.
 *
 * The bespoke hand‑drawn SVG glyphs were replaced with Phosphor so the whole app
 * shares one professionally‑drawn, consistent icon family (playful rounded look,
 * a single weight). The public API is deliberately unchanged: the same
 * `PetalIconName` union, the same `PetalIcon` props (`name`, `size`, `color`,
 * `filled`, `style`, `accessibilityLabel`), so all ~74 call sites keep working
 * with no edits. `filled` maps to Phosphor's `fill` weight; otherwise we use a
 * chunky `bold` weight that suits a kids' app. `strokeWidth` is accepted for
 * back‑compat but no longer meaningful (Phosphor controls its own stroke).
 */

export type PetalIconName =
  // -------------------------------------------------------------- navigation
  | 'home'
  | 'explore'
  | 'camera'
  | 'mentors'
  | 'rewards'
  | 'profile'
  // ---------------------------------------------------------------- activity
  | 'watch'
  | 'listen'
  | 'speak'
  | 'match'
  | 'trace'
  // ----------------------------------------------------------------- status
  | 'star'
  | 'heart'
  | 'lock'
  | 'check'
  | 'flame'
  | 'coin'
  | 'trophy'
  | 'medal'
  | 'sparkle'
  | 'seedling'
  // ---------------------------------------------------------------- control
  | 'sound'
  | 'soundOff'
  | 'microphone'
  | 'play'
  | 'pause'
  | 'replay'
  | 'flipCamera'
  | 'undo'
  | 'eraser'
  | 'pencil'
  // ------------------------------------------------------------------- chrome
  | 'back'
  | 'forward'
  | 'arrowUp'
  | 'arrowDown'
  | 'close'
  | 'settings'
  | 'parent'
  | 'notifications'
  | 'chart'
  | 'clock'
  | 'calendar'
  | 'book'
  | 'plus'
  | 'search'
  | 'logout'
  | 'trash'
  | 'info'
  | 'warning'
  | 'eye'
  | 'eyeOff'
  // ------------------------------------------------------------------ subject
  | 'subjectEnglish'
  | 'subjectEvs'
  | 'subjectMotor'
  | 'subjectHindi'
  | 'subjectMaths'
  | 'subjectSel';

export interface PetalIconProps {
  name: PetalIconName;
  /** Pixel size of the square icon box. Defaults to 24. */
  size?: number;
  /** Fill / stroke colour. Defaults to the primary text colour. */
  color?: string;
  /** Accepted for back‑compat; Phosphor controls its own stroke, so ignored. */
  strokeWidth?: number;
  /** Solid treatment — Phosphor `fill` weight. Used for active nav and earned badges. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Icons are decorative by default: the adjacent label carries the meaning.
   * Pass a label only when the icon is the *only* thing conveying it.
   */
  accessibilityLabel?: string;
}

/**
 * Phosphor's icon components accept `size`/`color`/`weight`/`style` and forward
 * any other props to their root `Svg` (so `accessibilityLabel` etc. pass
 * through). Typed loosely so those forwarded props don't fight the strict
 * per‑icon prop types.
 */
type PhosphorIcon = React.ComponentType<any>;

/** name → Phosphor glyph. One coherent, professionally‑drawn family. */
const GLYPHS: Record<PetalIconName, PhosphorIcon> = {
  // navigation
  home: House,
  explore: Compass,
  camera: Camera,
  mentors: UsersThree,
  rewards: Gift,
  profile: User,
  // activity
  watch: PlayCircle,
  listen: Ear,
  speak: Microphone,
  match: PuzzlePiece,
  trace: PencilSimple,
  // status
  star: Star,
  heart: Heart,
  lock: Lock,
  check: Check,
  flame: Flame,
  coin: Coins,
  trophy: Trophy,
  medal: Medal,
  sparkle: Sparkle,
  seedling: Plant,
  // control
  sound: SpeakerHigh,
  soundOff: SpeakerSlash,
  microphone: Microphone,
  play: Play,
  pause: Pause,
  replay: ArrowClockwise,
  flipCamera: CameraRotate,
  undo: ArrowCounterClockwise,
  eraser: Eraser,
  pencil: PencilSimple,
  // chrome
  back: CaretLeft,
  forward: CaretRight,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  close: X,
  settings: Gear,
  parent: ShieldCheck,
  notifications: Bell,
  chart: ChartBar,
  clock: Clock,
  calendar: CalendarBlank,
  book: BookOpen,
  plus: Plus,
  search: MagnifyingGlass,
  logout: SignOut,
  trash: Trash,
  info: Info,
  warning: Warning,
  eye: Eye,
  eyeOff: EyeSlash,
  // subjects
  subjectEnglish: TextAa,
  subjectEvs: Globe,
  subjectMotor: Hand,
  subjectHindi: Translate,
  subjectMaths: MathOperations,
  subjectSel: Smiley,
};

const PetalIconBase: React.FC<PetalIconProps> = ({
  name,
  size = iconSizes?.md ?? 24,
  color = colors.text,
  filled = false,
  style,
  accessibilityLabel,
}) => {
  const Glyph = GLYPHS[name];
  if (!Glyph) {
    if (__DEV__) {
      console.warn(`[PetalIcon] Unknown icon "${name}".`);
    }
    return null;
  }

  return (
    <Glyph
      size={size}
      color={color}
      // Chunky by default to match the playful‑premium look; solid when active.
      weight={filled ? 'fill' : 'bold'}
      style={style}
      // Phosphor forwards arbitrary props to its root <Svg>; the label makes it
      // announceable only when it is the sole carrier of meaning.
      {...(accessibilityLabel
        ? { accessible: true, accessibilityLabel, accessibilityRole: 'image' }
        : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' })}
    />
  );
};

/**
 * Memoized: an icon is drawn many times on every screen and its props are
 * primitives, so a parent re‑render should not force each one to re‑render.
 */
export const PetalIcon = React.memo(PetalIconBase);
PetalIcon.displayName = 'PetalIcon';

/** Every available icon name — handy for tests and the visual QA sheet. */
export const PETAL_ICON_NAMES = Object.keys(GLYPHS) as PetalIconName[];

export default PetalIcon;
