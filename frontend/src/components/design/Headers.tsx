import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  colors,
  radius,
  spacing,
  typography,
  headerSizes,
  cardSizes,
  progressSizes,
  stepRailSizes,
  getActivityColor,
} from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';
import { useAccentTint, PANEL_ALPHA } from './screenAccent';
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
  /** Per‑screen accent colour (matches the screen's scene). Tints the eyebrow. */
  accent?: string;
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
  accent,
  style,
}) => {
  /*
   * No panel. It was here because large display type over a full-strength
   * wallpaper competed with the art behind it — but the wallpaper is now blurred
   * and dimmed, and the title carries its own halo, so the panel was buying
   * contrast that is already paid for while boxing the greeting into a bar.
   */
  return (
  <View style={[styles.appHeader, style]}>
    <View style={styles.appHeaderText}>
      {eyebrow ? (
        <Text
          style={[typography.presets.section, styles.eyebrow, accent ? { color: accent } : null]}
          numberOfLines={1}
        >
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
      {/* Full size, not "sm": these are the child's two running totals and the
          main thing they look for, and at sm they read as afterthoughts beside
          the avatar rather than sitting level with it. */}
      {typeof streak === 'number' ? <RewardBadge kind="streak" value={streak} size="lg" /> : null}
      {typeof stars === 'number' ? <RewardBadge kind="stars" value={stars} size="lg" /> : null}
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
};

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
  /** Per‑screen accent colour (matches the screen's scene). Tints the subtitle. */
  accent?: string;
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
  accent,
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
          style={[
            typography.presets.section,
            styles.pageTitle,
            styles.pageTitleLarge,
            centered && styles.centeredText,
          ]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              typography.presets.caption,
              styles.pageSubtitle,
              centered && styles.centeredText,
              accent ? { color: accent } : null,
            ]}
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
  /* Same panel as the other two headers. */
  const panelFill = useAccentTint(0.07, PANEL_ALPHA);

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
    <View style={[styles.activityHeader, { backgroundColor: panelFill }, style]}>
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

/**
 * Contrast without a container.
 *
 * Dark type straight on an illustration is legible over the pale sky and lost
 * over the meadow, so headings carry a soft white halo with them — the surface
 * travels with the text instead of being a box drawn around it. This replaced
 * the translucent panels that used to sit behind every screen title.
 */
const HALO = {
  textShadowColor: 'rgba(255, 255, 255, 0.95)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 7,
} as const;

const styles = StyleSheet.create({
  // ---------------------------------------------------------------- AppHeader
  appHeader: {
    minHeight: headerSizes.heightTall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: cardSizes.gap,
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
    marginBottom: 2,
    ...HALO,
  },
  appTitle: {
    color: colors.text,
    ...HALO,
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
    /* No panel behind the title any more. A rounded card here boxed the screen
       name into a strip that ate ~64px of the fold and cut the wallpaper in
       half; the title is legible without it because it carries its own halo
       (see `pageTitle`). */
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
    ...HALO,
  },
  pageTitleLarge: {
    fontSize: 26,
    lineHeight: 32,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    marginTop: 1,
    ...HALO,
  },

  // ----------------------------------------------------------- ActivityHeader
  activityHeader: {
    /* Panelled like AppHeader and PageHeader, so the activity's name and
       progress read against a surface rather than the scene behind them. */
    marginHorizontal: spacing.lg,
    marginBottom: cardSizes.gap,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    backgroundColor: colors.surfaceTranslucent,
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
