import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  colors,
  radius,
  spacing,
  typography,
  headerSizes,
  progressSizes,
  stepRailSizes,
  getActivityColor,
} from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';
import { IconButton } from './Buttons';
import { RewardBadge, LivesIndicator } from './Badges';
import { ProgressIndicator } from './ProgressIndicator';

/**
 * Headers (spec §28).
 *
 *  - AppHeader      tab-level screens: greeting + star/streak pills + bell
 *  - PageHeader     pushed screens: back button + title + optional action
 *  - ActivityHeader the five learning activities: back, name, lives, progress
 *
 * All three sit on the page background rather than a separate bar, which is
 * what makes the reference design feel open rather than boxed-in.
 */

// ---------------------------------------------------------------------------
// AppHeader
// ---------------------------------------------------------------------------

export interface AppHeaderProps {
  /** Small line above the title, e.g. "Let's learn something new". */
  eyebrow?: string;
  title: string;
  /** Star total shown as a pill on the right. */
  stars?: number;
  /** Day-streak total shown as a pill on the right. */
  streak?: number;
  onPressNotifications?: () => void;
  /** Unread count; renders a dot on the bell when > 0. */
  notificationCount?: number;
  /** Extra controls appended to the right cluster. */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  eyebrow,
  title,
  stars,
  streak,
  onPressNotifications,
  notificationCount = 0,
  right,
  style,
}) => (
  <View style={[styles.appHeader, style]}>
    <View style={styles.appHeaderText}>
      {eyebrow ? (
        <Text style={[typography.presets.subtle, styles.eyebrow]} numberOfLines={1}>
          {eyebrow}
        </Text>
      ) : null}
      <Text
        style={[typography.presets.display, styles.appTitle]}
        /*
         * Two lines, not one. The right cluster is `flexShrink: 0` — chips must
         * keep their numbers legible — so on a 360px phone Home's cluster
         * (streak pill, star pill, profile avatar ≈ 152px) leaves the title about
         * 164px, while "Learning Journey" at 30px black needs roughly 280px. On
         * one line that rendered as "Learning Journ…". Allowing a second line
         * wraps it at the word instead, and the header's `minHeight` grows to
         * suit; a short title still occupies one line and looks identical.
         */
        numberOfLines={2}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>

    <View style={styles.rightCluster}>
      {typeof streak === 'number' ? <RewardBadge kind="streak" value={streak} size="sm" /> : null}
      {typeof stars === 'number' ? <RewardBadge kind="stars" value={stars} size="sm" /> : null}
      {right}
      {onPressNotifications ? (
        <View>
          <IconButton
            icon="notifications"
            variant="surface"
            tone="brand"
            size="sm"
            onPress={onPressNotifications}
            accessibilityLabel={
              notificationCount > 0
                ? `Notifications, ${notificationCount} unread`
                : 'Notifications'
            }
          />
          {notificationCount > 0 ? <View style={styles.dot} pointerEvents="none" /> : null}
        </View>
      ) : null}
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show the back chevron. Default true. */
  showBack?: boolean;
  /** Called instead of `goBack()`. */
  onBack?: () => void;
  /** Used when there is nothing to go back to. */
  backFallback?: () => void;
  /** A single trailing action. */
  action?: { icon: PetalIconName; label: string; onPress: () => void };
  right?: React.ReactNode;
  /** Centre the title between the side slots. Default true. */
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  backFallback,
  action,
  right,
  centered = true,
  style,
}) => {
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation.canGoBack()) return navigation.goBack();
    backFallback?.();
  };

  return (
    <View style={[styles.pageHeader, style]}>
      <View style={styles.side}>
        {showBack ? (
          <IconButton
            icon="back"
            variant="surface"
            tone="neutral"
            onPress={handleBack}
            accessibilityLabel="Go back"
          />
        ) : null}
      </View>

      <View style={[styles.pageHeaderText, centered && styles.centered]}>
        <Text
          style={[typography.presets.section, styles.pageTitle, centered && styles.centeredText]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[typography.presets.caption, styles.pageSubtitle, centered && styles.centeredText]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {right}
        {action ? (
          <IconButton
            icon={action.icon}
            variant="soft"
            tone="brand"
            onPress={action.onPress}
            accessibilityLabel={action.label}
          />
        ) : null}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// ActivityHeader
// ---------------------------------------------------------------------------

export type ActivityKind = 'watch' | 'listen' | 'speak' | 'match' | 'trace';

const ACTIVITY_META: Record<ActivityKind, { icon: PetalIconName; word: string }> = {
  watch: { icon: 'watch', word: 'Watch' },
  listen: { icon: 'listen', word: 'Listen' },
  speak: { icon: 'speak', word: 'Speak' },
  match: { icon: 'match', word: 'Match' },
  trace: { icon: 'trace', word: 'Trace' },
};

export interface ActivityHeaderProps {
  /** Drives the colour identity and the icon (spec §15). */
  kind: ActivityKind;
  /** The lesson or activity name, e.g. "Letter C". */
  title: string;
  /** Overrides the activity word shown in the eyebrow. */
  kindLabel?: string;
  onBack?: () => void;
  /**
   * Spoken label for the back control. Defaults to "Go back"; pass something
   * more specific when the destination is known, e.g. "Back to lesson".
   */
  backLabel?: string;
  /** Hearts remaining; omit to hide the indicator. */
  lives?: number;
  maxLives?: number;
  /**
   * How many activities this lesson contains. Supplying this (with `step`)
   * swaps the progress bar for the numbered rail — see `StepRail`.
   */
  steps?: number;
  /** Zero-based index of the activity the child is on. */
  step?: number;
  /** Step progress through the activity, 0-100. */
  progress?: number;
  /** "Question 2 of 5" style readout under the progress bar. */
  progressLabel?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The numbered step rail — (1)—(2)—(3)—(4) across the top of an activity.
 *
 * This replaces a thin percentage bar, and the reason is about what a five-year-
 * old can read. A bar filled to 50% answers "how far through am I" in a language
 * a child who cannot yet read a number line does not have; four numbered stops
 * with two of them ticked answers it in one they do. It also makes the lesson
 * feel finite — the child can see the end of the row.
 *
 * Completed stops are `success` with a tick, the current stop is filled in the
 * activity's own colour with a soft ring, and stops still to come are outlined.
 * Three states, three different shapes of information, so the rail survives
 * being seen in greyscale or by a colour-blind child.
 *
 * The whole rail is a single accessibility node. Nine separate circles would be
 * read out as nine unlabelled images, which is worse than useless; the row
 * announces "Activity 2 of 4" once and its children are hidden from the reader.
 */
const StepRail: React.FC<{
  steps: number;
  current: number;
  tone: { main: string; soft: string };
  label?: string;
}> = ({ steps, current, tone, label }) => (
  <View
    style={styles.rail}
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel={label ?? `Activity ${Math.min(current + 1, steps)} of ${steps}`}
  >
    {Array.from({ length: steps }, (_, i) => {
      const done = i < current;
      const here = i === current;
      return (
        <React.Fragment key={i}>
          {i > 0 ? (
            <View
              style={[styles.railLine, done || here ? { backgroundColor: tone.main } : null]}
              importantForAccessibility="no"
            />
          ) : null}
          <View
            style={[
              styles.railNode,
              done ? { backgroundColor: colors.success, borderColor: colors.success } : null,
              here ? { backgroundColor: tone.main, borderColor: tone.soft } : null,
            ]}
            importantForAccessibility="no-hide-descendants"
          >
            {done ? (
              <PetalIcon name="check" size={15} color={colors.textInverse} filled />
            ) : (
              <Text style={[styles.railNum, here ? styles.railNumHere : null]}>{i + 1}</Text>
            )}
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

export const ActivityHeader: React.FC<ActivityHeaderProps> = ({
  kind,
  title,
  kindLabel,
  onBack,
  backLabel = 'Go back',
  lives,
  maxLives = 3,
  steps,
  step = 0,
  progress,
  progressLabel,
  right,
  style,
}) => {
  const navigation = useNavigation<any>();
  const tone = getActivityColor(kind);
  const meta = ACTIVITY_META[kind];

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation.canGoBack()) navigation.goBack();
  };

  /*
   * The rail only ships when the lesson is short enough to draw one. Past
   * `maxSteps` the circles would have to shrink below a legible number, so a
   * long activity run keeps the percentage bar it always had. Every caller
   * already knows its `position.total`, so this is decided by real data rather
   * than by a flag someone has to remember to set.
   */
  const showRail = typeof steps === 'number' && steps > 1 && steps <= stepRailSizes.maxSteps;

  return (
    <View style={[styles.activityHeader, style]}>
      <View style={styles.activityTop}>
        <IconButton
          icon="back"
          variant="surface"
          tone="neutral"
          onPress={handleBack}
          accessibilityLabel={backLabel}
        />

        <View style={styles.activityTitleWrap}>
          <View style={styles.activityEyebrowRow}>
            <PetalIcon name={meta.icon} size={14} color={tone.main} filled />
            <Text style={[typography.presets.eyebrow, { color: tone.main }]} numberOfLines={1}>
              {kindLabel ?? meta.word}
            </Text>
          </View>
          <Text style={[typography.presets.cardTitle, styles.activityTitle]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>

        <View style={styles.activityRight}>
          {right}
          {typeof lives === 'number' ? <LivesIndicator lives={lives} max={maxLives} size={17} /> : null}
        </View>
      </View>

      {showRail ? (
        <StepRail steps={steps as number} current={step} tone={tone} label={progressLabel} />
      ) : typeof progress === 'number' ? (
        <ProgressIndicator
          value={progress}
          height={progressSizes.barHeightThin}
          color={tone.main}
          label={progressLabel}
          style={styles.activityProgress}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // ---------------------------------------------------------------- AppHeader
  appHeader: {
    minHeight: headerSizes.heightTall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  appHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textSecondary,
    marginBottom: 1,
  },
  appTitle: {
    color: colors.text,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexShrink: 0,
  },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },

  // --------------------------------------------------------------- PageHeader
  pageHeader: {
    minHeight: headerSizes.height,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  side: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  pageHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  centered: {
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  pageTitle: {
    color: colors.text,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    marginTop: 1,
  },

  // ----------------------------------------------------------- ActivityHeader
  activityHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  activityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  activityEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activityTitle: {
    color: colors.text,
    marginTop: 1,
  },
  activityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  activityProgress: {
    marginTop: spacing.md,
  },

  // ------------------------------------------------------------------ StepRail
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  railNode: {
    width: stepRailSizes.node,
    height: stepRailSizes.node,
    /* Half the box, not `radius.pill`: the node is a fixed circle and a 9999
       radius here would depend on the platform clamping it. */
    borderRadius: stepRailSizes.node / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    /* Every state carries the same border width so advancing a step never
       changes the geometry of the row — only its colours. */
    borderWidth: stepRailSizes.nodeRing,
    borderColor: colors.border,
    /* A circle must never be squeezed oval by the connectors either side. */
    flexShrink: 0,
    flexGrow: 0,
  },
  railLine: {
    /* The connectors absorb all the leftover width, which is what keeps the
       first and last stop pinned to the content edges at any step count. */
    flex: 1,
    height: stepRailSizes.connector,
    marginHorizontal: stepRailSizes.gap,
    borderRadius: stepRailSizes.connector,
    backgroundColor: colors.border,
  },
  railNum: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  railNumHere: {
    color: colors.textInverse,
  },
});

export default AppHeader;
