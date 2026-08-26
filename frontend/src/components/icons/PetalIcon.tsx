import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { StyleProp, ViewStyle } from 'react-native';
import { colors, iconSizes } from '../../theme';

/**
 * PetalPath icon set (spec §7).
 *
 * Every icon in the app comes from here. Emoji are never used as UI icons —
 * they render inconsistently across devices, don't inherit colour, and are
 * invisible to screen readers.
 *
 * House style: 24x24 grid, stroke-based, round caps and joins, 2px stroke.
 * That keeps the whole set feeling like one hand drew it, and lets a single
 * `color` prop tint anything.
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
  /** Stroke / fill colour. Defaults to the primary text colour. */
  color?: string;
  /** Stroke weight on the 24px grid. Slightly heavier when `active`. */
  strokeWidth?: number;
  /** Solid treatment — used for the selected bottom-nav item and earned badges. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Icons are decorative by default: the adjacent label carries the meaning.
   * Pass a label only when the icon is the *only* thing conveying it.
   */
  accessibilityLabel?: string;
}

type Renderer = (p: { c: string; sw: number; filled: boolean }) => React.ReactNode;

const S = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const GLYPHS: Record<PetalIconName, Renderer> = {
  // ============================================================ navigation
  home: ({ c, sw, filled }) => (
    <>
      <Path
        d="M3.6 10.2 12 3.6l8.4 6.6V19a1.6 1.6 0 0 1-1.6 1.6H5.2A1.6 1.6 0 0 1 3.6 19z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path
        d="M9.4 20.6v-5.2a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v5.2"
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  explore: ({ c, sw, filled }) => (
    <>
      <Circle cx={12} cy={12} r={8.6} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
      <Path
        d="M15.3 8.7l-2 4.6-4.6 2 2-4.6z"
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  camera: ({ c, sw, filled }) => (
    <>
      <Path
        d="M3.4 8.9a2 2 0 0 1 2-2h1.9l1.2-2h7l1.2 2h1.9a2 2 0 0 1 2 2v8.2a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Circle
        cx={12}
        cy={13}
        r={3.5}
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw}
        fill="none"
      />
    </>
  ),

  // A friendly animal face — the mentors are woodland buddies.
  mentors: ({ c, sw, filled }) => (
    <>
      <Path d="M5.4 5.2 7.6 8" stroke={c} strokeWidth={sw} {...S} />
      <Path d="M18.6 5.2 16.4 8" stroke={c} strokeWidth={sw} {...S} />
      <Path
        d="M4.6 6.4c-.5-1.6.6-2.6 2-2.1l2 .8m11-.8c-1.4-.5-2.5.5-2 2.1l-.5 1.6"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path
        d="M12 6.6c3.6 0 6.4 2.9 6.4 6.5S15.6 20.4 12 20.4 5.6 16.7 5.6 13.1 8.4 6.6 12 6.6z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Circle cx={9.7} cy={12.4} r={0.95} fill={filled ? '#FFFFFF' : c} />
      <Circle cx={14.3} cy={12.4} r={0.95} fill={filled ? '#FFFFFF' : c} />
      <Path
        d="M10.4 16.1c1 .8 2.2.8 3.2 0"
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  rewards: ({ c, sw, filled }) => (
    <>
      <Path
        d="M8.4 3.8h7.2v5.4a3.6 3.6 0 0 1-7.2 0z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M8.4 5.1H5.6v1.5a3 3 0 0 0 2.8 3" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M15.6 5.1h2.8v1.5a3 3 0 0 1-2.8 3" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M12 12.8v3.4" stroke={c} strokeWidth={sw} {...S} />
      <Path d="M8.6 20.2h6.8l-.8-4H9.4z" stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} {...S} />
    </>
  ),

  profile: ({ c, sw, filled }) => (
    <>
      <Circle cx={12} cy={8.6} r={3.9} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
      <Path
        d="M4.9 20.4c0-3.6 3.2-6.1 7.1-6.1s7.1 2.5 7.1 6.1"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
    </>
  ),

  // ============================================================== activity
  // Watch — a play triangle inside a screen.
  watch: ({ c, sw, filled }) => (
    <>
      <Rect
        x={2.8}
        y={4.6}
        width={18.4}
        height={13}
        rx={2.6}
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
      />
      <Path
        d="M10.4 8.9l4.4 2.2-4.4 2.2z"
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw}
        fill={filled ? '#FFFFFF' : 'none'}
        {...S}
      />
      <Path d="M8.4 20.4h7.2" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  // Listen — an ear with sound waves.
  listen: ({ c, sw }) => (
    <>
      <Path
        d="M7.6 10.2a4.4 4.4 0 1 1 8.8 0c0 2.2-1.6 3-2.4 4.1-.7.9-.4 2.1-.4 3.1a2.4 2.4 0 0 1-4.8 0"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M10.6 10.4a1.5 1.5 0 0 1 2.9.4" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M18.9 6.6a7.4 7.4 0 0 1 0 8" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M4.9 14.6a7.4 7.4 0 0 1 0-8" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  // Speak — a speech bubble with a soundwave inside.
  speak: ({ c, sw, filled }) => (
    <>
      <Path
        d="M4 7.4A2.6 2.6 0 0 1 6.6 4.8h10.8A2.6 2.6 0 0 1 20 7.4v6.2a2.6 2.6 0 0 1-2.6 2.6H11l-4.4 3.2v-3.2H6.6A2.6 2.6 0 0 1 4 13.6z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M8.6 9.4v2.2" stroke={filled ? '#FFFFFF' : c} strokeWidth={sw} {...S} />
      <Path d="M12 8.2v4.6" stroke={filled ? '#FFFFFF' : c} strokeWidth={sw} {...S} />
      <Path d="M15.4 9.4v2.2" stroke={filled ? '#FFFFFF' : c} strokeWidth={sw} {...S} />
    </>
  ),

  // Match — two shapes joined by a link.
  match: ({ c, sw, filled }) => (
    <>
      <Rect
        x={3.2}
        y={4.4}
        width={7}
        height={7}
        rx={2}
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
      />
      <Circle
        cx={17.3}
        cy={7.9}
        r={3.5}
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
      />
      <Path d="M10.2 7.9h3.6" stroke={c} strokeWidth={sw} {...S} />
      <Path
        d="M6.7 15.1v2.2a2.3 2.3 0 0 0 2.3 2.3h8.3"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M15.2 17.2l2.4 2.4-2.4 2.2" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  // Trace — a pencil following a dotted curve.
  trace: ({ c, sw }) => (
    <>
      <Path
        d="M3.4 17.6c2.6 0 3.4-9.6 7.2-9.6 3 0 2.4 7.2 5.2 7.2 1.8 0 2.4-3.2 4.8-3.2"
        stroke={c}
        strokeWidth={sw}
        strokeDasharray="2.6 2.8"
        fill="none"
        {...S}
      />
      <Path
        d="M14.4 20.6l-3.5.7.7-3.5 6.1-6.1a1.4 1.4 0 0 1 2 0l.8.8a1.4 1.4 0 0 1 0 2z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  // ================================================================ status
  star: ({ c, sw, filled }) => (
    <Path
      d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z"
      stroke={c}
      strokeWidth={sw}
      fill={filled ? c : 'none'}
      {...S}
    />
  ),

  heart: ({ c, sw, filled }) => (
    <Path
      d="M12 20.2S3.8 15.4 3.8 9.9a4.5 4.5 0 0 1 8.2-2.6 4.5 4.5 0 0 1 8.2 2.6c0 5.5-8.2 10.3-8.2 10.3z"
      stroke={c}
      strokeWidth={sw}
      fill={filled ? c : 'none'}
      {...S}
    />
  ),

  lock: ({ c, sw, filled }) => (
    <>
      <Rect
        x={4.6}
        y={10.4}
        width={14.8}
        height={9.8}
        rx={2.8}
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
      />
      <Path
        d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Circle cx={12} cy={15.3} r={1.4} fill={filled ? '#FFFFFF' : c} />
    </>
  ),

  check: ({ c, sw }) => (
    <Polyline points="4.8,12.9 9.6,17.6 19.2,6.8" stroke={c} strokeWidth={sw + 0.4} fill="none" {...S} />
  ),

  flame: ({ c, sw, filled }) => (
    <>
      <Path
        d="M12 3.2c3.3 3.1 5.9 5.5 5.9 9.4a5.9 5.9 0 0 1-11.8 0c0-2.2 1-3.6 2.3-5.1"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path
        d="M12 13.1c1.3 1.2 2 2 2 3.1a2 2 0 0 1-4 0c0-1.1.7-1.9 2-3.1z"
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  coin: ({ c, sw, filled }) => (
    <>
      <Circle cx={12} cy={12} r={8.4} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
      <Path
        d="M12 7.6v8.8M14.4 9.4a2.6 2.6 0 0 0-4.8 1.2c0 2.4 4.8 1.4 4.8 3.6a2.6 2.6 0 0 1-4.8 0"
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  trophy: ({ c, sw, filled }) => (
    <>
      <Path
        d="M7.6 4.4h8.8v5.2a4.4 4.4 0 0 1-8.8 0z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M7.6 5.8H4.8v1.6a3.2 3.2 0 0 0 3 3.2" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M16.4 5.8h2.8v1.6a3.2 3.2 0 0 1-3 3.2" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M12 14v3.2M8.4 20.2h7.2" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  medal: ({ c, sw, filled }) => (
    <>
      <Path d="M8 3.4l2.6 5.4M16 3.4l-2.6 5.4" stroke={c} strokeWidth={sw} {...S} />
      <Circle cx={12} cy={14.6} r={5.8} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
      <Path
        d="M12 11.4l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z"
        stroke={filled ? '#FFFFFF' : c}
        strokeWidth={sw - 0.4}
        fill="none"
        {...S}
      />
    </>
  ),

  sparkle: ({ c, sw, filled }) => (
    <>
      <Path
        d="M12 3.4l1.7 4.9 4.9 1.7-4.9 1.7L12 16.6l-1.7-4.9-4.9-1.7 4.9-1.7z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M18.4 15.6l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" stroke={c} strokeWidth={sw - 0.6} fill={filled ? c : 'none'} {...S} />
    </>
  ),

  // A sprout — used for empty states, in keeping with the garden theme.
  seedling: ({ c, sw, filled }) => (
    <>
      <Path d="M12 20.4v-6.2" stroke={c} strokeWidth={sw} {...S} />
      <Path
        d="M12 14.2C12 10.6 9.2 8.4 5.6 8.4c0 3.6 2.8 5.8 6.4 5.8z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path
        d="M12 14.2c0-3.6 2.8-5.8 6.4-5.8 0 3.6-2.8 5.8-6.4 5.8z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M8.8 20.4h6.4" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  // =============================================================== control
  sound: ({ c, sw, filled }) => (
    <>
      <Path
        d="M4 9.6h3.2L12 5.4v13.2L7.2 14.4H4z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M15.4 9.4a3.7 3.7 0 0 1 0 5.2" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  soundOff: ({ c, sw, filled }) => (
    <>
      <Path
        d="M4 9.6h3.2L12 5.4v13.2L7.2 14.4H4z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M15.8 9.8l4.4 4.4M20.2 9.8l-4.4 4.4" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  microphone: ({ c, sw, filled }) => (
    <>
      <Rect
        x={9}
        y={2.9}
        width={6}
        height={10.6}
        rx={3}
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
      />
      <Path
        d="M5.6 11.6a6.4 6.4 0 0 0 12.8 0"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M12 18v3M8.8 21h6.4" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  play: ({ c, sw, filled }) => (
    <Path
      d="M7.4 4.9 19 12 7.4 19.1z"
      stroke={c}
      strokeWidth={sw}
      fill={filled ? c : 'none'}
      {...S}
    />
  ),

  pause: ({ c, sw, filled }) => (
    <>
      <Rect x={7} y={4.8} width={3.6} height={14.4} rx={1.6} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
      <Rect x={13.4} y={4.8} width={3.6} height={14.4} rx={1.6} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
    </>
  ),

  replay: ({ c, sw }) => (
    <>
      <Path
        d="M20 12a8 8 0 1 1-2.6-5.9"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M20.2 3.8v4.4h-4.4" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  flipCamera: ({ c, sw }) => (
    <>
      <Path
        d="M4.4 12a7.6 7.6 0 0 1 12.9-5.4"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M17.6 3.4v3.6H14" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path
        d="M19.6 12a7.6 7.6 0 0 1-12.9 5.4"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M6.4 20.6V17h3.6" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  undo: ({ c, sw }) => (
    <>
      <Path d="M8.4 6.2 4 10.6l4.4 4.4" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path
        d="M4 10.6h9.4a5.8 5.8 0 0 1 0 11.6H8.6"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  eraser: ({ c, sw }) => (
    <>
      <Path
        d="M9.4 19.6H5.9a1.8 1.8 0 0 1-1.3-3.1l8.6-8.6a1.8 1.8 0 0 1 2.6 0l4 4a1.8 1.8 0 0 1 0 2.6l-5.1 5.1z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M9.9 11.1l5.4 5.4M11.4 19.6h8.8" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  pencil: ({ c, sw }) => (
    <>
      <Path
        d="M7.4 20.6l-3.8.8.8-3.8L15.7 6.3a1.6 1.6 0 0 1 2.3 0l1.4 1.4a1.6 1.6 0 0 1 0 2.3z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M14.2 7.8l3.4 3.4" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  // ================================================================ chrome
  back: ({ c, sw }) => (
    <>
      <Path d="M19.2 12H5" stroke={c} strokeWidth={sw + 0.2} {...S} />
      <Path d="M10.8 6.2 5 12l5.8 5.8" stroke={c} strokeWidth={sw + 0.2} fill="none" {...S} />
    </>
  ),

  forward: ({ c, sw }) => (
    <>
      <Path d="M4.8 12H19" stroke={c} strokeWidth={sw + 0.2} {...S} />
      <Path d="M13.2 6.2 19 12l-5.8 5.8" stroke={c} strokeWidth={sw + 0.2} fill="none" {...S} />
    </>
  ),

  arrowUp: ({ c, sw }) => (
    <Path d="M6.4 14.4 12 8.8l5.6 5.6" stroke={c} strokeWidth={sw + 0.2} fill="none" {...S} />
  ),

  arrowDown: ({ c, sw }) => (
    <Path d="M6.4 9.6 12 15.2l5.6-5.6" stroke={c} strokeWidth={sw + 0.2} fill="none" {...S} />
  ),

  close: ({ c, sw }) => (
    <Path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" stroke={c} strokeWidth={sw + 0.2} {...S} />
  ),

  settings: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={12} r={2.9} stroke={c} strokeWidth={sw} fill="none" />
      <Path
        d="M12 2.9l1 2.3 2.5-.5 1.3 2.2-1.8 1.8 1.8 1.8-1.3 2.2-2.5-.5-1 2.3-1-2.3-2.5.5L7.2 13l1.8-1.8L7.2 9.4l1.3-2.2 2.5.5z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        transform="translate(0 3.6)"
        {...S}
      />
    </>
  ),

  // A grown-up + child pair.
  parent: ({ c, sw, filled }) => (
    <>
      <Circle cx={9} cy={7.4} r={3.2} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
      <Path
        d="M3.4 19.6c0-3.1 2.5-5.2 5.6-5.2s5.6 2.1 5.6 5.2"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Circle cx={17.4} cy={11.4} r={2.3} stroke={c} strokeWidth={sw} fill={filled ? c : 'none'} />
      <Path
        d="M14.6 19.6c0-2.2 1.3-3.6 2.8-3.6s2.8 1.4 2.8 3.6"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
    </>
  ),

  notifications: ({ c, sw, filled }) => (
    <>
      <Path
        d="M6.4 10.4a5.6 5.6 0 0 1 11.2 0c0 3.4.9 4.6 1.6 5.6H4.8c.7-1 1.6-2.2 1.6-5.6z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path d="M10.2 19a2 2 0 0 0 3.6 0" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M12 4.8V3.2" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  chart: ({ c, sw }) => (
    <>
      <Path d="M4 20h16" stroke={c} strokeWidth={sw} {...S} />
      <Rect x={5.4} y={12} width={3.6} height={5.8} rx={1.4} stroke={c} strokeWidth={sw} fill="none" />
      <Rect x={10.2} y={7.6} width={3.6} height={10.2} rx={1.4} stroke={c} strokeWidth={sw} fill="none" />
      <Rect x={15} y={10} width={3.6} height={7.8} rx={1.4} stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),

  clock: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={12} r={8.4} stroke={c} strokeWidth={sw} fill="none" />
      <Path d="M12 7.4V12l3.2 2" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  calendar: ({ c, sw }) => (
    <>
      <Rect x={3.8} y={5.6} width={16.4} height={14.6} rx={2.8} stroke={c} strokeWidth={sw} fill="none" />
      <Path d="M3.8 10.2h16.4M8.6 3.4v3.6M15.4 3.4v3.6" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  book: ({ c, sw, filled }) => (
    <>
      <Path
        d="M4 5.4a1.6 1.6 0 0 1 1.6-1.6H10a2.6 2.6 0 0 1 2 1v14a2.6 2.6 0 0 0-2-1H5.6A1.6 1.6 0 0 1 4 16.2z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
      <Path
        d="M20 5.4a1.6 1.6 0 0 0-1.6-1.6H14a2.6 2.6 0 0 0-2 1v14a2.6 2.6 0 0 1 2-1h4.4a1.6 1.6 0 0 0 1.6-1.6z"
        stroke={c}
        strokeWidth={sw}
        fill={filled ? c : 'none'}
        {...S}
      />
    </>
  ),

  plus: ({ c, sw }) => (
    <Path d="M12 5.4v13.2M5.4 12h13.2" stroke={c} strokeWidth={sw + 0.4} {...S} />
  ),

  search: ({ c, sw }) => (
    <>
      <Circle cx={10.8} cy={10.8} r={6.6} stroke={c} strokeWidth={sw} fill="none" />
      <Path d="M15.6 15.6 20 20" stroke={c} strokeWidth={sw + 0.2} {...S} />
    </>
  ),

  logout: ({ c, sw }) => (
    <>
      <Path
        d="M14.4 4.4H6.8a2 2 0 0 0-2 2v11.2a2 2 0 0 0 2 2h7.6"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M15.6 8.4 19.2 12l-3.6 3.6M19.2 12h-8.4" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  trash: ({ c, sw }) => (
    <>
      <Path d="M4.4 7.4h15.2" stroke={c} strokeWidth={sw} {...S} />
      <Path
        d="M6.6 7.4h10.8l-.9 11.4a1.8 1.8 0 0 1-1.8 1.6H9.3a1.8 1.8 0 0 1-1.8-1.6z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M9.4 7.4V5a1.6 1.6 0 0 1 1.6-1.6h2a1.6 1.6 0 0 1 1.6 1.6v2.4" stroke={c} strokeWidth={sw} fill="none" {...S} />
      <Path d="M10.4 11v5.4M13.6 11v5.4" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  info: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={12} r={8.4} stroke={c} strokeWidth={sw} fill="none" />
      <Path d="M12 11v5.4" stroke={c} strokeWidth={sw} {...S} />
      <Circle cx={12} cy={7.9} r={1.1} fill={c} />
    </>
  ),

  warning: ({ c, sw }) => (
    <>
      <Path
        d="M12 3.9l8.8 15.2H3.2z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M12 9.4v4.4" stroke={c} strokeWidth={sw} {...S} />
      <Circle cx={12} cy={16.6} r={1.1} fill={c} />
    </>
  ),

  // Reveal / hide — the password toggle on the auth forms.
  eye: ({ c, sw }) => (
    <>
      <Path
        d="M2.6 12S6.2 5.8 12 5.8 21.4 12 21.4 12 17.8 18.2 12 18.2 2.6 12 2.6 12z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Circle cx={12} cy={12} r={3.1} stroke={c} strokeWidth={sw} fill="none" />
    </>
  ),

  eyeOff: ({ c, sw }) => (
    <>
      <Path
        d="M9.6 6.2A8.9 8.9 0 0 1 12 5.8c5.8 0 9.4 6.2 9.4 6.2a17 17 0 0 1-2.5 3.3M6.1 8A17 17 0 0 0 2.6 12S6.2 18.2 12 18.2a8.7 8.7 0 0 0 3.4-.7"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path
        d="M10 10.1a3.1 3.1 0 0 0 4.2 4.3"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M4.2 4.2 19.8 19.8" stroke={c} strokeWidth={sw} {...S} />
    </>
  ),

  // =============================================================== subjects
  // English — an open book with a letter.
  subjectEnglish: ({ c, sw }) => (
    <>
      <Path
        d="M3.6 6a1.6 1.6 0 0 1 1.6-1.6h5A2.4 2.4 0 0 1 12 5.6v13a2.4 2.4 0 0 0-1.8-1H5.2A1.6 1.6 0 0 1 3.6 16z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path
        d="M20.4 6a1.6 1.6 0 0 0-1.6-1.6h-5A2.4 2.4 0 0 0 12 5.6v13a2.4 2.4 0 0 1 1.8-1h5A1.6 1.6 0 0 0 20.4 16z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M15 13.4 16.8 8.4l1.8 5M15.6 11.8h2.4" stroke={c} strokeWidth={sw - 0.4} fill="none" {...S} />
    </>
  ),

  // Environmental studies — a leaf and globe.
  subjectEvs: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={12} r={8.4} stroke={c} strokeWidth={sw} fill="none" />
      <Path d="M3.6 12h16.8" stroke={c} strokeWidth={sw} {...S} />
      <Path
        d="M12 3.6c2.4 2.5 2.4 14.3 0 16.8-2.4-2.5-2.4-14.3 0-16.8z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
    </>
  ),

  // Fine motor & cognitive — a jigsaw piece.
  subjectMotor: ({ c, sw }) => (
    <Path
      d="M5.4 5.4h3.9a2 2 0 1 1 3.9 0h4.2a1.2 1.2 0 0 1 1.2 1.2v3.9a2 2 0 1 0 0 3.9v4.2a1.2 1.2 0 0 1-1.2 1.2h-4.2a2 2 0 1 0-3.9 0H5.4a1.2 1.2 0 0 1-1.2-1.2v-4.2a2 2 0 1 1 0-3.9V6.6a1.2 1.2 0 0 1 1.2-1.2z"
      stroke={c}
      strokeWidth={sw}
      fill="none"
      {...S}
    />
  ),

  // Hindi — the "अ" idea rendered as a bookmark + script stroke.
  subjectHindi: ({ c, sw }) => (
    <>
      <Path d="M4.8 6.4h14.4" stroke={c} strokeWidth={sw} {...S} />
      <Path
        d="M8.6 6.4v6.9a3.3 3.3 0 1 0 3.3 3.3V9.9"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M15.6 6.4v11.8" stroke={c} strokeWidth={sw} {...S} />
      <Path d="M11.9 12.6c1.3-1.5 2.6-1.5 3.7-.7" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),

  // Maths — plus/minus/multiply/divide on a grid.
  subjectMaths: ({ c, sw }) => (
    <>
      <Rect x={3.6} y={3.6} width={16.8} height={16.8} rx={3.4} stroke={c} strokeWidth={sw} fill="none" />
      <Path d="M7.4 8.6h3.4M9.1 6.9v3.4" stroke={c} strokeWidth={sw} {...S} />
      <Path d="M13.2 8.6h3.4" stroke={c} strokeWidth={sw} {...S} />
      <Path d="M7.7 14.2l2.8 2.8M10.5 14.2l-2.8 2.8" stroke={c} strokeWidth={sw} {...S} />
      <Path d="M13.2 15.6h3.4" stroke={c} strokeWidth={sw} {...S} />
      <Circle cx={14.9} cy={13.2} r={0.85} fill={c} />
      <Circle cx={14.9} cy={18} r={0.85} fill={c} />
    </>
  ),

  // Social-emotional learning — two hands making a heart.
  subjectSel: ({ c, sw }) => (
    <>
      <Path
        d="M12 18.4S6 14.8 6 10.8a3.4 3.4 0 0 1 6-2 3.4 3.4 0 0 1 6 2c0 4-6 7.6-6 7.6z"
        stroke={c}
        strokeWidth={sw}
        fill="none"
        {...S}
      />
      <Path d="M4 20.6c1.8-1.4 3.4-1.4 4.6-.6M20 20.6c-1.8-1.4-3.4-1.4-4.6-.6" stroke={c} strokeWidth={sw} fill="none" {...S} />
    </>
  ),
};

export const PetalIcon: React.FC<PetalIconProps> = ({
  name,
  size = iconSizes?.md ?? 24,
  color = colors.text,
  strokeWidth,
  filled = false,
  style,
  accessibilityLabel,
}) => {
  const render = GLYPHS[name];
  if (!render) {
    if (__DEV__) {
      console.warn(`[PetalIcon] Unknown icon "${name}".`);
    }
    return null;
  }

  // Scale the stroke a little with the box so small icons stay legible and
  // large ones don't look spindly.
  const sw = strokeWidth ?? (size <= 18 ? 2.2 : size >= 40 ? 1.7 : 2);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      // Decorative by default — the adjacent label carries the meaning.
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {render({ c: color, sw, filled })}
    </Svg>
  );
};

/** Every available icon name — handy for tests and the visual QA sheet. */
export const PETAL_ICON_NAMES = Object.keys(GLYPHS) as PetalIconName[];

export default PetalIcon;
