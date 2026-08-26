import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  cardSizes,
  progressSizes,
  getActivityColor,
} from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';
import { AvatarGlyph } from './AvatarGlyph';
import { Card } from './Card';
import { PrimaryButton, IconButton } from './Buttons';
import { StatusBadge, RewardBadge, LessonStatus } from './Badges';
import { ProgressIndicator } from './ProgressIndicator';
import { getSubjectVisual } from './subjectVisuals';

/**
 * Content cards (spec §28).
 *
 * Every list row in the app is one of these. They all share the same `Card`
 * surface, the same icon-well geometry and the same chevron affordance, which
 * is what stops each screen from drifting into its own visual language (§33).
 */

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Rounded tinted square holding a leading icon. */
const IconWell: React.FC<{
  icon: PetalIconName;
  color: string;
  soft: string;
  size?: number;
  filled?: boolean;
}> = ({ icon, color, soft, size = cardSizes.iconWell, filled = false }) => (
  <View
    style={[
      styles.well,
      { width: size, height: size, borderRadius: radius.cardInner, backgroundColor: soft },
    ]}
  >
    <PetalIcon name={icon} size={Math.round(size * 0.52)} color={color} filled={filled} />
  </View>
);

const Chevron: React.FC<{ open?: boolean; color?: string }> = ({ open, color }) => (
  <PetalIcon
    name={open === undefined ? 'forward' : open ? 'arrowUp' : 'arrowDown'}
    size={20}
    color={color ?? colors.textSecondary}
  />
);

// ---------------------------------------------------------------------------
// SubjectCard  (spec §14)
// ---------------------------------------------------------------------------

export interface SubjectCardProps {
  name: string;
  /** Total skills in the subject. */
  skillCount: number;
  /** How many of those are finished. */
  completedCount: number;
  /** Index in the list — only used to pick a fallback colour. */
  index?: number;
  /** Renders an up/down chevron instead of a forward one. */
  expanded?: boolean;
  onPress?: () => void;
  /** Revealed under the header when `expanded`. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  name,
  skillCount,
  completedCount,
  index = 0,
  expanded,
  onPress,
  children,
  style,
}) => {
  const v = getSubjectVisual(name, index);
  const pct = skillCount > 0 ? (completedCount / skillCount) * 100 : 0;
  const done = skillCount > 0 && completedCount >= skillCount;

  return (
    <Card
      variant={expanded ? 'selected' : 'raised'}
      accent={v.color}
      rail
      padding="normal"
      onPress={onPress}
      style={[styles.stack, style]}
      accessibilityLabel={`${name}. ${completedCount} of ${skillCount} skills completed.`}
      accessibilityHint={expanded === undefined ? 'Opens the subject' : 'Expands the skill list'}
    >
      <View style={styles.row}>
        <IconWell icon={v.icon} color={v.color} soft={v.soft} />

        <View style={styles.rowText}>
          <Text style={[typography.presets.cardTitle, styles.title]} numberOfLines={2}>
            {name}
          </Text>
          <Text style={[typography.presets.caption, styles.meta]} numberOfLines={1}>
            {skillCount} {skillCount === 1 ? 'skill' : 'skills'} · {completedCount} completed
          </Text>
        </View>

        {done ? <StatusBadge status="completed" size="sm" iconOnly /> : null}
        <Chevron open={expanded} color={v.color} />
      </View>

      {skillCount > 0 ? (
        <ProgressIndicator
          value={pct}
          height={progressSizes.barHeightThin}
          color={v.color}
          style={styles.cardProgress}
          accessibilityLabel={`${name} progress`}
        />
      ) : null}

      {expanded && children ? <View style={styles.expansion}>{children}</View> : null}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// LessonCard
// ---------------------------------------------------------------------------

export interface LessonCardProps {
  title: string;
  /** Theme or module the lesson belongs to — rendered as an eyebrow. */
  eyebrow?: string;
  status: LessonStatus;
  /** Percentage through the lesson's activities, 0-100. */
  progress?: number;
  stars?: number;
  maxStars?: number;
  /** e.g. "2 activities left". */
  footnote?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  title,
  eyebrow,
  status,
  progress,
  stars,
  maxStars = 3,
  footnote,
  onPress,
  style,
}) => {
  const locked = status === 'locked';
  const accent =
    status === 'completed' ? colors.green : status === 'current' ? colors.purple : colors.primary;

  return (
    <Card
      variant={locked ? 'muted' : status === 'current' ? 'selected' : 'raised'}
      accent={locked ? colors.textMuted : accent}
      rail
      padding="normal"
      onPress={locked ? undefined : onPress}
      disabled={locked}
      style={[styles.stack, style]}
      accessibilityLabel={`${title}. ${locked ? 'Locked.' : status === 'completed' ? 'Completed.' : 'Current lesson.'}`}
    >
      <View style={styles.row}>
        <View style={styles.rowText}>
          {eyebrow ? (
            <Text style={[typography.presets.eyebrow, { color: accent }]} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text style={[typography.presets.cardTitle, styles.title]} numberOfLines={2}>
            {title}
          </Text>
          {footnote ? (
            <Text style={[typography.presets.caption, styles.meta]} numberOfLines={1}>
              {footnote}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={status} size="sm" />
      </View>

      {typeof progress === 'number' && !locked ? (
        <ProgressIndicator
          value={progress}
          height={progressSizes.barHeightThin}
          color={accent}
          style={styles.cardProgress}
          accessibilityLabel={`${title} progress`}
        />
      ) : null}

      {typeof stars === 'number' ? (
        <View style={styles.starRow}>
          {Array.from({ length: maxStars }).map((_, i) => (
            <PetalIcon
              key={i}
              name="star"
              size={16}
              filled={i < stars}
              color={i < stars ? colors.yellow : colors.border}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// ActivityCard  (spec §15)
// ---------------------------------------------------------------------------

export type ActivityCardKind =
  | 'watch'
  | 'video'
  | 'listen'
  | 'speak'
  | 'match'
  | 'drag_drop'
  | 'trace'
  | 'write'
  | 'stories'
  | 'camera';

const ACTIVITY_META: Record<ActivityCardKind, { icon: PetalIconName; word: string }> = {
  watch: { icon: 'watch', word: 'Watch' },
  video: { icon: 'watch', word: 'Watch' },
  listen: { icon: 'listen', word: 'Listen & Choose' },
  speak: { icon: 'speak', word: 'Speak & Learn' },
  match: { icon: 'match', word: 'Match & Learn' },
  drag_drop: { icon: 'match', word: 'Match & Learn' },
  trace: { icon: 'trace', word: 'Trace & Draw' },
  write: { icon: 'trace', word: 'Trace & Draw' },
  stories: { icon: 'book', word: 'Story' },
  camera: { icon: 'camera', word: 'Camera' },
};

export interface ActivityCardProps {
  kind: ActivityCardKind;
  /** Defaults to the activity's own name, e.g. "Listen & Choose". */
  title?: string;
  /** e.g. "3 min" or "5 questions". */
  meta?: string;
  completed?: boolean;
  locked?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  kind,
  title,
  meta,
  completed = false,
  locked = false,
  onPress,
  style,
}) => {
  const m = ACTIVITY_META[kind] ?? ACTIVITY_META.watch;
  const tone = locked ? getActivityColor('locked') : getActivityColor(kind);
  const label = title ?? m.word;

  return (
    <Card
      variant={locked ? 'muted' : 'raised'}
      accent={tone.main}
      rail
      padding="compact"
      onPress={locked ? undefined : onPress}
      disabled={locked}
      style={[styles.stack, style]}
      accessibilityLabel={`${label}. ${locked ? 'Locked.' : completed ? 'Completed.' : 'Ready to start.'}`}
    >
      <View style={[styles.row, styles.rowTall]}>
        <IconWell
          icon={locked ? 'lock' : m.icon}
          color={tone.main}
          soft={tone.soft}
          size={cardSizes.iconWellSmall}
          filled={completed}
        />
        <View style={styles.rowText}>
          <Text style={[typography.presets.cardTitle, styles.title]} numberOfLines={1}>
            {label}
          </Text>
          {meta ? (
            <Text style={[typography.presets.caption, styles.meta]} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>

        {completed ? (
          <StatusBadge status="completed" size="sm" iconOnly />
        ) : locked ? (
          <StatusBadge status="locked" size="sm" iconOnly />
        ) : (
          <Chevron color={tone.main} />
        )}
      </View>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// RewardCard
// ---------------------------------------------------------------------------

export interface RewardCardProps {
  title: string;
  description?: string;
  unlocked: boolean;
  /** Stars needed to unlock; shown as a requirement when still locked. */
  starValue?: number;
  /** `sticker` uses the sparkle glyph, `badge` uses the medal. */
  kind?: 'sticker' | 'badge' | 'trophy';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const RewardCard: React.FC<RewardCardProps> = ({
  title,
  description,
  unlocked,
  starValue,
  kind = 'sticker',
  onPress,
  style,
}) => {
  const icon: PetalIconName = unlocked
    ? kind === 'badge'
      ? 'medal'
      : kind === 'trophy'
      ? 'trophy'
      : 'sparkle'
    : 'lock';
  const color = unlocked ? colors.yellow : colors.textMuted;
  const soft = unlocked ? colors.yellowSoft : colors.skeleton;

  return (
    <Card
      variant={unlocked ? 'raised' : 'muted'}
      padding="normal"
      onPress={onPress}
      style={[styles.stack, style]}
      accessibilityLabel={`${title}. ${unlocked ? 'Unlocked.' : 'Locked.'}`}
    >
      <View style={styles.row}>
        <IconWell icon={icon} color={color} soft={soft} filled={unlocked} />
        <View style={styles.rowText}>
          <Text style={[typography.presets.cardTitle, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          {description ? (
            <Text style={[typography.presets.caption, styles.meta]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        {typeof starValue === 'number' && starValue > 0 ? (
          <RewardBadge kind="stars" value={starValue} size="sm" />
        ) : unlocked ? (
          <StatusBadge status="completed" size="sm" iconOnly />
        ) : null}
      </View>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// MentorCard
// ---------------------------------------------------------------------------

export interface MentorCardProps {
  name: string;
  /** e.g. "Panda". */
  species?: string;
  /** The mentor's signature colour, from `constants/mentors`. */
  color?: string;
  /** Shown when the card is selected. */
  funFact?: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const MentorCard: React.FC<MentorCardProps> = ({
  name,
  species,
  color = colors.primary,
  funFact,
  selected = false,
  onPress,
  style,
}) => (
  <Card
    variant={selected ? 'selected' : 'raised'}
    accent={color}
    padding="normal"
    onPress={onPress}
    style={[styles.stack, style]}
    accessibilityLabel={`${name}${species ? `, ${species}` : ''}.${selected ? ' Selected.' : ''}`}
    accessibilityHint={selected ? undefined : 'Choose this learning buddy'}
  >
    <View style={styles.row}>
      {/* The buddies have real faces in `AvatarGlyph`, and `species` is already
          on the props, so the card shows the actual animal rather than the
          generic `mentors` glyph every mentor used to share (§8). */}
      <AvatarGlyph
        species={species}
        size={cardSizes.iconWellLarge}
        ringColor={selected ? color : undefined}
        style={styles.mentorAvatar}
      />

      <View style={styles.rowText}>
        <Text style={[typography.presets.cardTitle, styles.title]} numberOfLines={1}>
          {name}
        </Text>
        {species ? (
          <Text style={[typography.presets.eyebrow, { color }]} numberOfLines={1}>
            {species}
          </Text>
        ) : null}
        {funFact ? (
          <Text style={[typography.presets.caption, styles.meta]} numberOfLines={2}>
            {funFact}
          </Text>
        ) : null}
      </View>

      {selected ? <StatusBadge status="completed" label="Buddy" size="sm" /> : <Chevron color={color} />}
    </View>
  </Card>
);

// ---------------------------------------------------------------------------
// ProfileCard
// ---------------------------------------------------------------------------

export interface ProfileCardProps {
  name: string;
  /** e.g. "Age 5 · Penny Panda". */
  detail?: string;
  /**
   * The child's chosen avatar id (`avatar_panda`, `avatar_fox`, …). When given,
   * the card draws that animal's face instead of initials — the avatar the child
   * actually picked, rather than a generic monogram (§8).
   */
  species?: string | null;
  /** Two-letter initials shown in the avatar. Used when `species` is absent. */
  initials?: string;
  /** Avatar background; pass the child's chosen avatar colour. */
  avatarColor?: string;
  /** Marks the currently active child. */
  active?: boolean;
  /** Small stat chips under the name — stars, progress, rewards. */
  stats?: Array<{ icon: PetalIconName; value: string; label: string; color?: string }>;
  action?: { icon: PetalIconName; label: string; onPress: () => void };
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  detail,
  species,
  initials,
  avatarColor = colors.primaryLight,
  active = false,
  stats,
  action,
  onPress,
  style,
}) => (
  <Card
    variant={active ? 'selected' : 'raised'}
    accent={colors.primary}
    padding="normal"
    onPress={onPress}
    style={[styles.stack, style]}
    accessibilityLabel={`${name}${detail ? `, ${detail}` : ''}${active ? ', active profile' : ''}`}
  >
    <View style={styles.row}>
      {species ? (
        <AvatarGlyph
          species={species}
          size={cardSizes.iconWell}
          ringColor={active ? colors.primary : undefined}
          style={styles.profileAvatar}
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor, borderColor: 'transparent' }]}>
          {initials ? (
            <Text style={[typography.presets.cardTitle, { color: colors.text }]}>{initials}</Text>
          ) : (
            <PetalIcon name="profile" size={28} color={colors.text} />
          )}
        </View>
      )}

      <View style={styles.rowText}>
        <Text style={[typography.presets.cardTitle, styles.title]} numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <Text style={[typography.presets.caption, styles.meta]} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>

      {active ? <StatusBadge status="current" label="Active" size="sm" /> : null}
      {action ? (
        <IconButton
          icon={action.icon}
          variant="soft"
          tone="brand"
          size="sm"
          onPress={action.onPress}
          accessibilityLabel={action.label}
        />
      ) : onPress ? (
        <Chevron />
      ) : null}
    </View>

    {stats && stats.length > 0 ? (
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <PetalIcon name={s.icon} size={18} color={s.color ?? colors.primary} filled />
            <Text style={[typography.presets.stat, styles.statValue]}>{s.value}</Text>
            <Text style={[typography.presets.caption, styles.meta]}>{s.label}</Text>
          </View>
        ))}
      </View>
    ) : null}
  </Card>
);

// ---------------------------------------------------------------------------
// ContinueLearningCard  (spec §13)
// ---------------------------------------------------------------------------

export interface ContinueLearningCardProps {
  /** Theme / subject the lesson sits under. */
  eyebrow?: string;
  lessonTitle: string;
  /** The activity that will open, e.g. "Listen & Choose". */
  nextActivity?: string;
  nextActivityKind?: ActivityCardKind;
  /** Percentage for the track, 0-100. */
  progress?: number;
  /**
   * What the track is counting, e.g. "1 of 27 lessons complete". Rendered above
   * the bar and used as its accessibility label, so a caller that changes what
   * `progress` measures cannot leave the screen reader describing the old thing.
   */
  progressLabel?: string;
  /** Text on the CTA. Defaults to "Continue Learning". */
  ctaLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single most prominent thing on the Home screen. Deliberately louder
 * than every other card: solid pink, white type, its own progress track.
 *
 * The lesson title is set at `display` (30px) when it is short enough to hold one
 * line. Almost all of this curriculum's titles are — "Letter B", "Number 5",
 * "Colours" — and giving them that size is what puts a focal point on the Home
 * screen: nothing else on it is larger than 19px, and a screen with no biggest
 * thing is what reads as bland. Longer titles fall back to `section` rather than
 * wrapping a 30px line twice and swamping the card.
 */
export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({
  eyebrow,
  lessonTitle,
  nextActivity,
  nextActivityKind = 'watch',
  progress,
  progressLabel,
  ctaLabel = 'Continue Learning',
  onPress,
  style,
}) => {
  const m = ACTIVITY_META[nextActivityKind] ?? ACTIVITY_META.watch;

  /* 18 characters is what fits on one `display` line beside the icon well at
     360px. Measured, not guessed: 328 card − 36 padding − 44 well − 12 gap
     ≈ 236px, and `display` averages ~13px per glyph at this weight. */
  const heroTitle = lessonTitle.trim().length <= 18;

  return (
    <View style={[styles.continue, style]}>
      <View style={styles.continueTop}>
        <View style={styles.continueWell}>
          <PetalIcon name={m.icon} size={22} color={colors.white} filled />
        </View>
        <View style={styles.rowText}>
          <Text style={[typography.presets.eyebrow, styles.continueEyebrow]} numberOfLines={1}>
            {eyebrow ?? 'Continue learning'}
          </Text>
          <Text
            style={[
              heroTitle ? typography.presets.display : typography.presets.section,
              styles.continueTitle,
            ]}
            numberOfLines={2}
          >
            {lessonTitle}
          </Text>
          {nextActivity ? (
            <Text style={[typography.presets.caption, styles.continueMeta]} numberOfLines={1}>
              Up next · {nextActivity}
            </Text>
          ) : null}
        </View>
      </View>

      {typeof progress === 'number' ? (
        <View style={styles.continueProgress}>
          {progressLabel ? (
            <Text
              style={[typography.presets.caption, styles.continueProgressLabel]}
              numberOfLines={1}
            >
              {progressLabel}
            </Text>
          ) : null}
          <ProgressIndicator
            value={progress}
            height={progressSizes.barHeightThin}
            color={colors.white}
            trackColor="rgba(255,255,255,0.28)"
            accessibilityLabel={progressLabel ?? 'Lesson progress'}
          />
        </View>
      ) : null}

      <PrimaryButton
        label={ctaLabel}
        icon="play"
        tone="neutral"
        size="md"
        onPress={onPress}
        style={styles.continueCta}
        labelStyle={{ color: colors.primaryDark }}
        accessibilityHint={`Opens ${nextActivity ?? lessonTitle}`}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  stack: {
    marginBottom: cardSizes.gap,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTall: {
    minHeight: cardSizes.iconWellSmall,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  well: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    color: colors.text,
  },
  meta: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardProgress: {
    marginTop: spacing.md,
  },
  expansion: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  starRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  avatar: {
    width: cardSizes.iconWellLarge,
    height: cardSizes.iconWellLarge,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    flexShrink: 0,
  },
  /* `AvatarGlyph` draws its own circle and ring, so this only has to stop the
     avatar being squeezed by a long mentor name. */
  mentorAvatar: {
    flexShrink: 0,
  },
  /* Same for the child avatar on `ProfileCard`. */
  profileAvatar: {
    flexShrink: 0,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  statValue: {
    color: colors.text,
  },

  // ------------------------------------------------------- ContinueLearning
  continue: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    /* `padding` rather than `paddingRoomy`: this card carries the theme tally now
       that the roadmap header above it is gone, so it gained a line of text and
       had to give back the chrome to stay the same height. */
    padding: cardSizes.padding,
    marginBottom: cardSizes.gap,
    /* The one card that should look like it is sitting on top of the page. Every
       other `Card` gets `shadows.sm`; a flat pink rectangle at the same elevation
       reads as a block of colour rather than as the thing to tap. Tinted rather
       than black, and at a higher opacity than the token, because a black shadow
       under saturated pink goes grey and dirty while `primaryDark` deepens it. */
    ...shadows.md,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.18,
  },
  continueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  continueWell: {
    width: cardSizes.iconWellSmall,
    height: cardSizes.iconWellSmall,
    borderRadius: radius.cardInner,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  continueEyebrow: {
    color: 'rgba(255,255,255,0.85)',
  },
  continueTitle: {
    color: colors.white,
    marginTop: 2,
  },
  continueMeta: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 3,
  },
  continueProgress: {
    marginTop: spacing.md,
  },
  continueProgressLabel: {
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.xs,
  },
  continueCta: {
    marginTop: spacing.md,
  },
});

export { IconWell };
