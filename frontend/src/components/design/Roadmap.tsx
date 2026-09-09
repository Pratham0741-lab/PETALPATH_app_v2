import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  roadmapSizes,
  LESSON_STATE,
  resolveLessonState,
  progressSizes,
} from '../../theme';
import type { LessonState } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { PetalIcon, PetalIconName } from '../icons';
import { ProgressIndicator } from './ProgressIndicator';

/**
 * Roadmap (spec §10, §11) — the learning journey.
 *
 * This is deliberately NOT a vertical timeline. A single curvy SVG path runs
 * down the centre of the screen; lesson nodes sit on it, swinging alternately
 * left and right of centre, and each node's text label sits on the opposite
 * side to the swing so labels alternate right / left / right / left down the
 * page and always land in the empty half of the row.
 *
 * Geometry is derived from the measured container width, never from a fixed
 * screen size (§27), so it reflows from 360px to tablet without overflowing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * `review` is a lesson the child has already finished that the adaptive engine
 * wants seen again — a fifth state rather than a flavour of `completed`,
 * because it has to out-rank the tick: every review *is* a completed lesson, so
 * anything that tests completion first would hide the whole feature.
 */
export type RoadmapNodeStatus = 'completed' | 'current' | 'available' | 'locked' | 'review';

/**
 * What a stop *is*, independent of how it is going.
 *
 * `practice` is the day's reviews gathered into one stop that sits in front of
 * the new lesson — a kind rather than a status on purpose. It wears the `review`
 * status while there is something to do and `completed` once it is done, so it
 * inherits both existing skins and needs no colour of its own; kind only decides
 * the glyph and what the pill says.
 */
export type RoadmapNodeKind = 'lesson' | 'quiz' | 'trophy' | 'practice';

export interface RoadmapNodeData {
  id: string;
  title: string;
  /** Second line under the title, e.g. "2 activities left". */
  subtitle?: string;
  status: RoadmapNodeStatus;
  kind?: RoadmapNodeKind;
  stars?: number;
  maxStars?: number;
  /**
   * Where the screen should scroll to, and which node wears the halo. Defaults
   * to whichever node has `status: 'current'`.
   *
   * Needed because the two can come apart: when a review blocks the next
   * lesson, the review is the node the child must act on, and there is no
   * `current` node in the run at all. Without this, `onCurrentNodeLayout` never
   * fires and the journey silently stops scrolling to the right place.
   */
  focus?: boolean;
  onPress?: () => void;
}

export interface RoadmapSectionData {
  id: string;
  title: string;
  subtitle?: string;
  /** Theme colour; falls back to the brand pink. */
  color?: string;
  icon?: PetalIconName;
  /** 0-100 across the section. */
  progress?: number;
  /** Rendered only when the section is expanded. */
  nodes?: RoadmapNodeData[];
  locked?: boolean;
  onPress?: () => void;
  /** Chevron direction; omit for a plain header with no toggle. */
  expanded?: boolean;
  /**
   * Draw the nodes with no header row above them. For the section a caller has
   * already titled elsewhere — Home puts the open theme's name and tally on the
   * Continue card — so the same two facts aren't stated twice in a row.
   */
  hideHeader?: boolean;
}

export interface RoadmapFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoadmapProps {
  sections: RoadmapSectionData[];
  /**
   * Fires with the current node's box measured relative to the Roadmap's own
   * top-left — so a screen can add the Roadmap's offset and scroll to it, or
   * point the tutorial hand at it.
   */
  onCurrentNodeLayout?: (frame: RoadmapFrame) => void;
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Node appearance
// ---------------------------------------------------------------------------

interface NodeSkin {
  size: number;
  fill: string;
  border: string;
  borderWidth: number;
  icon: PetalIconName;
  iconColor: string;
  filled: boolean;
  /** Word shown next to the label so state never rests on colour alone (§30). */
  word: string;
  wordColor: string;
  /** Fill for the lesson card beside the node. */
  cardFill: string;
  /** Border for that card — the state's ink, so the edge holds on any wallpaper. */
  cardBorder: string;
}

/** Roadmap vocabulary -> the app-wide state palette. */
const NODE_STATE: Record<RoadmapNodeStatus, LessonState> = {
  completed: 'done',
  current: 'ongoing',
  review: 'practice',
  available: 'ready',
  locked: 'locked',
};

/*
 * The roadmap used to carry its own colours, and they disagreed with every other
 * surface: "current" was brand pink here but purple on a LessonCard, and
 * "review" was purple here but blue in the garden. Two screens taught the child
 * opposite meanings for the same two hues. Colour, icon, word and card fill all
 * come from `LESSON_STATE` now; only the geometry — node size, border weight,
 * filled vs outlined — stays local, because that is layout rather than meaning.
 */
const skinFor = (status: RoadmapNodeStatus, kind: RoadmapNodeKind): NodeSkin => {
  const kindIcon: PetalIconName =
    kind === 'quiz'
      ? 'sparkle'
      : kind === 'trophy'
        ? 'trophy'
        : kind === 'practice'
          ? 'replay'
          : 'play';

  const sv = LESSON_STATE[NODE_STATE[status] ?? 'locked'];
  const shared = {
    word: sv.label,
    wordColor: sv.main,
    cardFill: sv.soft,
    cardBorder: sv.main,
  };

  switch (status) {
    case 'completed':
      return {
        ...shared,
        size: roadmapSizes.nodeCompleted,
        fill: sv.main,
        border: colors.white,
        borderWidth: 3,
        icon: 'check',
        iconColor: colors.white,
        filled: true,
      };
    case 'current':
      /* The biggest node on the path, so "where I am" is found by size as well
         as by colour before any of it is read. */
      return {
        ...shared,
        size: roadmapSizes.nodeCurrent,
        fill: sv.main,
        border: colors.white,
        borderWidth: 4,
        icon: kindIcon,
        iconColor: colors.white,
        filled: true,
      };
    case 'review':
      return {
        ...shared,
        size: roadmapSizes.nodeCompleted,
        fill: sv.main,
        border: colors.white,
        borderWidth: 3,
        icon: sv.icon,
        iconColor: colors.white,
        filled: true,
      };
    case 'available':
      /* Outlined rather than filled: open, but nothing has happened in it yet. */
      return {
        ...shared,
        size: roadmapSizes.nodeCompleted,
        fill: colors.surface,
        border: sv.main,
        borderWidth: 3,
        icon: kindIcon,
        iconColor: sv.main,
        filled: false,
      };
    default:
      return {
        ...shared,
        size: roadmapSizes.nodeLocked,
        fill: sv.soft,
        border: colors.border,
        borderWidth: 2,
        icon: sv.icon,
        iconColor: sv.main,
        filled: false,
      };
  }
};

// ---------------------------------------------------------------------------
// LessonNode
// ---------------------------------------------------------------------------

export interface LessonNodeProps {
  status: RoadmapNodeStatus;
  kind?: RoadmapNodeKind;
  /** Used for the accessible name; the visible label is rendered by Roadmap. */
  title: string;
  /**
   * Replaces the composed "{title}. {state}." name. `Roadmap` passes the whole
   * card's content here — title, subtitle and star score — because the card
   * beside the node is hidden from the screen reader and this node is the one
   * place that information gets spoken.
   */
  accessibilityLabel?: string;
  onPress?: () => void;
  /** Adds the breathing halo. Roadmap sets this for the current lesson. */
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A single circular stop on the journey. Exported on its own because the
 * Lesson Overview and Curriculum screens reuse it outside the path.
 */
export const LessonNode: React.FC<LessonNodeProps> = ({
  status,
  kind = 'lesson',
  title,
  accessibilityLabel,
  onPress,
  highlight = false,
  style,
  testID,
}) => {
  const skin = skinFor(status, kind);
  const locked = status === 'locked';
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!highlight || reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.97, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlight, reduceMotion, pulse]);

  // Keeps a 44px locked node inside the 48px minimum tap area (§30).
  const hit = Math.max(0, (48 - skin.size) / 2);

  return (
    <Animated.View style={[{ transform: [{ scale: pulse }] }, style]}>
      {highlight ? (
        <View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: skin.size + 22,
              height: skin.size + 22,
              borderRadius: (skin.size + 22) / 2,
              top: -11,
              left: -11,
              /*
               * Tinted to the node it surrounds. A pink halo around the purple
               * review stop would read as two states arguing about one lesson.
               */
              backgroundColor: status === 'review' ? colors.purpleSoft : colors.primaryLight,
            },
          ]}
        />
      ) : null}

      <Pressable
        onPress={locked ? undefined : onPress}
        disabled={locked || !onPress}
        hitSlop={{ top: hit, bottom: hit, left: hit, right: hit }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${title}. ${skin.word}.`}
        accessibilityState={{ disabled: locked || !onPress }}
        testID={testID}
        style={({ pressed }) => [
          styles.node,
          status === 'locked' ? null : shadows.sm,
          {
            width: skin.size,
            height: skin.size,
            borderRadius: skin.size / 2,
            backgroundColor: skin.fill,
            borderColor: skin.border,
            borderWidth: skin.borderWidth,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <PetalIcon
          name={skin.icon}
          /* 0.55 of the node, up from 0.42. At the old ratio the padlock was a
             ~18px mark adrift in a 44px circle, which read as an empty disc with
             a speck in it — and the padlock is now the only thing saying the
             stop is locked, since the card no longer spells it out. */
          size={Math.round(skin.size * 0.55)}
          color={skin.iconColor}
          filled={skin.filled}
        />
      </Pressable>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Path run — the curvy SVG spine plus its nodes and alternating labels
// ---------------------------------------------------------------------------

/**
 * Splits a leading "26. " index off a lesson title.
 *
 * The number is bookkeeping — it says where the stop sits in a list of
 * twenty-seven — while "Letter Z" is the thing the child is looking for. Drawn
 * at one size they compete, and on a two-line title the number takes a whole
 * line of the card. Kept (a child does use it to find their place) but demoted.
 */
const splitTitleIndex = (title: string): { index: string | null; topic: string } => {
  const m = /^(\d+\.)\s*(.+)$/.exec(title);
  return m ? { index: m[1], topic: m[2] } : { index: null, topic: title };
};

interface RunProps {
  nodes: RoadmapNodeData[];
  /** Continues the left/right swing across section boundaries. */
  parity: number;
  width: number;
  color: string;
  /** Measured against this, so the reported y ignores intermediate wrappers. */
  measureRoot?: React.RefObject<View | null>;
  onCurrentNodeLayout?: RoadmapProps['onCurrentNodeLayout'];
}

const PathRun: React.FC<RunProps> = ({
  nodes,
  parity,
  width,
  color,
  measureRoot,
  onCurrentNodeLayout,
}) => {
  const {
    rowHeight,
    rowHeightLocked,
    amplitude,
    pathWidth,
    pathUnderlayWidth,
    pathDashWidth,
    labelGap,
  } = roadmapSizes;
  // Only one node is ever current, so a single ref covers the run.
  const currentSlotRef = useRef<View>(null);
  /*
   * Lesson cards are not a translucent white wash. Every card looked the same
   * regardless of state, the fill changed with whatever art sat behind it, and
   * the only differentiators were a thin border and a word. Each card takes its
   * state's own `soft` fill — the same tints the badges and chips use — so a
   * finished stop is green, one in progress purple, one wanting practice blue,
   * all at a glance and all opaque enough to hold dark text.
   */

  // Swing scales with the viewport so the path never pushes labels off-screen.
  const amp = Math.max(22, Math.min(amplitude, width * 0.16));
  const centreX = width / 2;

  /*
   * Rows are no longer a uniform height, so positions come from a running sum
   * rather than `rowHeight * (i + 0.5)`. A locked stop gets the shorter row: it
   * has no CURRENT pill, no star row and a single-line label, so the full height
   * was empty space, and a long locked tail read as a wall of grey.
   */
  const points = useMemo(() => {
    let cursor = 0;
    return nodes.map((n, i) => {
      const h = n.status === 'locked' ? rowHeightLocked : rowHeight;
      const left = (i + parity) % 2 === 0;
      const point = {
        node: n,
        left,
        x: centreX + (left ? -amp : amp),
        y: cursor + h / 2,
        rowTop: cursor,
        rowH: h,
      };
      cursor += h;
      return point;
    });
  }, [nodes, parity, amp, centreX, rowHeight, rowHeightLocked]);

  const height = useMemo(
    () => points.reduce((sum, p) => sum + p.rowH, 0),
    [points],
  );

  const d = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0]!;
    // Lead-in and lead-out stubs so runs read as one continuous journey.
    let out = `M ${first.x} 0`;
    out += ` L ${first.x} ${first.y}`;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const mid = (a.y + b.y) / 2;
      out += ` C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`;
    }
    const last = points[points.length - 1]!;
    out += ` L ${last.x} ${height}`;
    return out;
  }, [points, height]);

  if (points.length === 0) return null;

  /**
   * `onLayout` only ever reports a box relative to its direct parent, which
   * here is one absolutely-positioned row — useless for scrolling. Measuring
   * against the Roadmap root gives a y a screen can actually scroll to; the
   * fallback is the analytic position within this run.
   */
  const reportCurrent = (fallback: RoadmapFrame) => {
    if (!onCurrentNodeLayout) return;
    const root = measureRoot?.current as any;
    const slot = currentSlotRef.current as any;
    if (root && typeof slot?.measureLayout === 'function') {
      try {
        slot.measureLayout(
          root,
          (x: number, y: number, w: number, h: number) =>
            onCurrentNodeLayout({ x, y, width: w, height: h }),
          () => onCurrentNodeLayout(fallback),
        );
        return;
      } catch {
        // Falls through to the analytic value below.
      }
    }
    onCurrentNodeLayout(fallback);
  };

  return (
    <View style={{ height }}>
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill as StyleProp<ViewStyle>}
        pointerEvents="none"
      >
        {/*
          * Three layers make a trail rather than a line. A wide soft halo so the
          * ribbon sits in the page instead of on it; a solid band in the section's
          * colour; and a dashed white centre marking down the middle of that band,
          * which is what says "path" — the same device a garden trail or a road
          * uses. Previously the dash was the *only* stroke at 5px wide, so the
          * journey read as a dotted leader between list items.
          */}
        <Path
          d={d}
          stroke={color}
          strokeOpacity={0.14}
          strokeWidth={pathUnderlayWidth}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={d}
          stroke={color}
          strokeOpacity={0.42}
          strokeWidth={pathWidth}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={d}
          stroke={colors.white}
          strokeOpacity={0.75}
          strokeWidth={pathDashWidth}
          strokeLinecap="round"
          strokeDasharray="7 11"
          fill="none"
        />
      </Svg>

      {points.map(({ node, left, x, y, rowTop, rowH }) => {
        const skin = skinFor(node.status, node.kind ?? 'lesson');
        const half = skin.size / 2;
        const isCurrent = node.status === 'current';
        const isReview = node.status === 'review';
        /*
         * `current` normally *is* the focus, but not always — see `focus` on
         * RoadmapNodeData. Everything that points at one node (the halo, the
         * measured slot, the scroll report) keys off this; the CURRENT pill and
         * the heavier title stay keyed to the status, because those describe
         * what the node *is* rather than where the eye should go.
         */
        const isFocus = node.focus ?? isCurrent;
        const locked = node.status === 'locked';
        const earned = node.stars ?? 0;
        const maxStars = node.maxStars ?? 3;
        /*
         * Stars on reviews too. The child earned them last time, and seeing two
         * of three is the clearest possible answer to "why this one again?".
         */
        const showStars =
          typeof node.stars === 'number' && (node.status === 'completed' || isReview);

        /*
         * The card sits on the opposite side to the swing, so cards alternate
         * right / left / right / left down the page and always land in the open
         * half of the row. Both edges are pinned, which makes every card on a
         * side the same width — ragged card edges either side of a centre ribbon
         * read as a broken layout rather than a path.
         */
        const cardBox: ViewStyle = left
          ? { left: x + half + labelGap, right: spacing.xs }
          : { left: spacing.xs, right: width - (x - half - labelGap) };

        /*
         * Everything the card shows is spoken by the node instead. Two touch
         * targets for one lesson is good for a child's aim; two announcements
         * for one lesson is a screen reader reading the journey twice.
         */
        const { index: titleIndex, topic: titleTopic } = splitTitleIndex(node.title);

        const spoken = [
          node.title,
          skin.word,
          node.subtitle,
          showStars ? `${earned} of ${maxStars} stars` : undefined,
        ]
          .filter(Boolean)
          .join('. ');

        return (
          <View key={node.id} style={[styles.row, { top: rowTop, height: rowH }]}>
            <View
              ref={isFocus ? currentSlotRef : undefined}
              style={[styles.nodeSlot, { left: x - half, top: rowH / 2 - half }]}
              onLayout={
                isFocus && onCurrentNodeLayout
                  ? () =>
                      reportCurrent({
                        x: x - half,
                        y: y - half,
                        width: skin.size,
                        height: skin.size,
                      })
                  : undefined
              }
            >
              <LessonNode
                status={node.status}
                kind={node.kind}
                title={node.title}
                accessibilityLabel={`${spoken}.`}
                onPress={node.onPress}
                highlight={isFocus}
                testID={`roadmap-node-${node.id}`}
              />
            </View>

            <View style={[styles.cardBox, cardBox]} pointerEvents="box-none">
              <Pressable
                onPress={locked ? undefined : node.onPress}
                disabled={locked || !node.onPress}
                importantForAccessibility="no-hide-descendants"
                style={({ pressed }) => [
                  styles.lessonCard,
                  locked ? styles.lessonCardLocked : shadows.sm,
                  { backgroundColor: skin.cardFill, borderColor: skin.cardBorder },
                  pressed && !locked ? styles.lessonCardPressed : null,
                ]}
              >
                {isCurrent || isReview ? (
                  <View style={[styles.currentPill, isReview ? styles.reviewPill : null]}>
                    <PetalIcon
                      name={isReview ? 'replay' : 'sparkle'}
                      size={11}
                      color={colors.white}
                      filled
                    />
                    {/*
                      A practice stop names itself. "PRACTICE AGAIN" is right on a
                      lesson the child recognises, but the gathered stop is not a
                      lesson they have seen before, and calling it what the app
                      calls it everywhere else is what makes it findable.
                    */}
                    <Text style={styles.currentPillText}>
                      {node.kind === 'practice'
                        ? 'PRACTICE SESSION'
                        : isReview
                          ? 'PRACTICE AGAIN'
                          : 'CURRENT'}
                    </Text>
                  </View>
                ) : null}

                <Text
                  numberOfLines={2}
                  style={[
                    typography.presets.title,
                    isCurrent || isReview ? styles.stopTitleLarge : styles.stopTitle,
                    { color: locked ? colors.textMuted : colors.text },
                  ]}
                >
                  {titleIndex ? (
                    <Text style={styles.stopIndex}>{titleIndex} </Text>
                  ) : null}
                  {titleTopic}
                </Text>

                {/*
                  A locked stop says so three times over: the padlock in the
                  node, the grey card, and this word. The other states earn
                  their line — "Done", "Practice", "In progress" each add
                  something the icon alone does not — but "Locked" under a
                  padlock is just the padlock again. Still spoken: `spoken`
                  below carries `skin.word` for the screen reader either way.
                */}
                {node.subtitle || !locked ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      typography.presets.subtle,
                      node.subtitle ? styles.labelMeta : { color: skin.wordColor },
                    ]}
                  >
                    {node.subtitle ?? skin.word}
                  </Text>
                ) : null}

                {showStars ? (
                  <View style={styles.stars}>
                    {Array.from({ length: maxStars }, (_, si) => (
                      <PetalIcon
                        key={si}
                        name="star"
                        size={13}
                        filled={si < earned}
                        color={si < earned ? colors.yellow : colors.border}
                      />
                    ))}
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

const SectionHeader: React.FC<{
  section: RoadmapSectionData;
  color: string;
  sectionFill: string;
}> = ({ section, color, sectionFill }) => {
  const tint = sectionFill;
  const content = (
    <View style={styles.sectionInner}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}1F` }]}>
        <PetalIcon
          name={section.locked ? 'lock' : section.icon ?? 'seedling'}
          size={20}
          color={section.locked ? colors.textMuted : color}
        />
      </View>

      <View style={styles.sectionText}>
        <Text
          numberOfLines={1}
          style={[
            typography.presets.cardTitle,
            /* Near-black, not the state colour: the border, icon well and
               progress bar already say the state; the title's job is to be
               legible over whatever the wallpaper puts behind it. */
            { color: section.locked ? colors.textMuted : colors.text },
          ]}
        >
          {section.title}
        </Text>
        {section.subtitle ? (
          <Text numberOfLines={1} style={[typography.presets.caption, styles.labelMeta]}>
            {section.subtitle}
          </Text>
        ) : null}
        {typeof section.progress === 'number' ? (
          <ProgressIndicator
            value={section.progress}
            height={progressSizes.barHeightThin}
            color={color}
            style={styles.sectionProgress}
            accessibilityLabel={`${section.title} progress`}
          />
        ) : null}
      </View>

      {/*
        No expand chevron. The header is a full-width pressable and the module's
        lessons appear directly beneath it, so the arrow was pointing at a change
        the child can already see happen. `accessibilityState.expanded` on the
        Pressable still announces it.
      */}
    </View>
  );

  if (!section.onPress) {
    return (
      <View style={[styles.section, { borderColor: color, backgroundColor: tint }]}>{content}</View>
    );
  }

  return (
    <Pressable
      onPress={section.onPress}
      accessibilityRole="button"
      accessibilityLabel={section.title}
      accessibilityState={{ expanded: section.expanded, disabled: !!section.locked }}
      style={({ pressed }) => [
        styles.section,
        { borderColor: color, backgroundColor: tint },
        pressed && styles.sectionPressed,
      ]}
    >
      {content}
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

export const Roadmap: React.FC<RoadmapProps> = ({
  sections,
  onCurrentNodeLayout,
  style,
}) => {
  const window = useWindowDimensions();
  const rootRef = useRef<View>(null);
  // Sensible first paint, then corrected by the real measurement.
  const [width, setWidth] = useState(Math.max(280, window.width - spacing.lg * 2));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== width) setWidth(w);
  };

  let parity = 0;

  return (
    <View ref={rootRef} style={style} onLayout={onLayout} collapsable={false}>
      {sections.map((section) => {
        /*
         * The section's colour says how far along it is, matching the nodes
         * inside it and every card elsewhere. It used to be `section.color` — a
         * per-theme hue with no legend — so a finished section and an untouched
         * one were the same colour, and only the bar's length told them apart.
         */
        const sectionState = resolveLessonState({
          locked: section.locked,
          done: (section.progress ?? 0) >= 100,
          progress: section.progress,
        });
        const color = LESSON_STATE[sectionState].main;
        const nodes = section.nodes ?? [];
        const runParity = parity;
        parity = (parity + nodes.length) % 2;

        return (
          <View key={section.id}>
            {section.hideHeader ? null : <SectionHeader section={section} color={color} sectionFill={LESSON_STATE[sectionState].soft} />}
            {nodes.length > 0 ? (
              <PathRun
                nodes={nodes}
                parity={runParity}
                width={width}
                color={color}
                measureRoot={rootRef}
                onCurrentNodeLayout={onCurrentNodeLayout}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  node: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: colors.primaryLight,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  nodeSlot: {
    position: 'absolute',
  },
  cardBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  /**
   * The lesson card. This replaced a bare text label sitting on the page
   * background, and the reason is that the label had no edges: with a ribbon
   * running down the middle and loose text either side, there was nothing to say
   * where one lesson ended and the next began, so a grade read as one long column
   * of words rather than as a series of stops. A card gives each lesson a body.
   *
   * It is also a second, much larger touch target for the same lesson — roughly
   * 160×80 against the node's 48px circle. For a four-year-old aiming with a
   * whole hand that is the difference between opening the lesson they meant and
   * opening nothing.
   */
  lessonCard: {
    borderRadius: radius.cardInner,
    /* 1.5px of real border, not a near-white hairline: over an illustration a
       `borderLight` edge disappears and the card has no shape at all. */
    borderWidth: 1.5,
    /* Tighter than before: the card was mostly padding around a 15px title, so
       it read as a big box with small writing in it. Less air, larger type. */
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
  },
  reviewPill: {
    backgroundColor: LESSON_STATE.practice.main,
  },
  /* Locked stops lose the shadow and sit flat on a tinted fill: a grade is
     twenty-seven lessons and most are locked, so the ones a child cannot open
     must not each claim their own elevation. */
  lessonCardLocked: {
    /* Flat, no shadow — a locked stop should not look liftable. Its fill and
       border still come from the skin, like every other state. */
  },
  lessonCardPressed: {
    opacity: 0.85,
  },
  /* The topic itself. `title` (24px) is the base; the current stop goes larger
     still, because it is the one the child is meant to find. */
  stopTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  stopTitleLarge: {
    fontSize: 26,
    lineHeight: 32,
  },
  /* The "26." — normal reading size, so it sits beside the topic without
     claiming a line of its own. */
  stopIndex: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  labelMeta: {
    color: colors.textSecondary,
    marginTop: 1,
  },
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: LESSON_STATE.ongoing.main,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  currentPillText: {
    ...typography.presets.eyebrow,
    color: colors.white,
    fontSize: 9.5,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },

  // ---------------------------------------------------------------- section
  section: {
    borderRadius: radius.card,
    /* No 6px left strip — the whole border carries the state colour instead, so
       the card reads as one object rather than a card with a tab stuck to it. */
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  sectionPressed: {
    opacity: 0.85,
  },
  sectionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.cardInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: {
    flex: 1,
    minWidth: 0,
  },
  sectionProgress: {
    marginTop: spacing.sm,
  },
});

export default Roadmap;
