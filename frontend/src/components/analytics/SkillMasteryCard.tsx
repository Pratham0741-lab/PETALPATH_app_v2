import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { ProgressIndicator } from '../design/ProgressIndicator';
import { SecondaryButton } from '../design/Buttons';
import { colors, progressSizes, spacing } from '../../theme';
import { MetricCard } from './MetricCard';

/**
 * Per-skill mastery, top few.
 *
 * Two things were wrong here beyond the styling. The four state colours were
 * hardcoded hexes that existed nowhere else in the app (§29) — they are theme
 * tokens now. And "View All" was a centred blue `Text` with no `onPress`: a
 * control that looks tappable and does nothing (§33). It is a real button when
 * the screen supplies `onViewAll`, and absent when it does not.
 *
 * The state is also written out next to the skill name, because a bar that is
 * orange rather than green is not a difference every parent can see (§30).
 */

interface SkillMasteryCardProps {
  skills: Array<{ name: string; score: number; state: string }>;
  loading?: boolean;
  maxItems?: number;
  /** Supply to show a real "View All" button; omitted, no button is drawn. */
  onViewAll?: () => void;
  style?: StyleProp<ViewStyle>;
}

const STATE_COLORS: Record<string, string> = {
  mastered: colors.success,
  in_progress: colors.blue,
  needs_practice: colors.warning,
  locked: colors.textMuted,
};

/** `needs_practice` → `Needs practice`. Unknown states pass through readably. */
function humanizeState(state: string): string {
  const words = state.replace(/[_-]+/g, ' ').trim();
  if (words.length === 0) return '';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function SkillMasteryCard({
  skills,
  loading = false,
  maxItems = 5,
  onViewAll,
  style,
}: SkillMasteryCardProps) {
  const visible = skills.slice(0, maxItems);
  const hidden = Math.max(0, skills.length - maxItems);
  const mastered = skills.filter((s) => s.state === 'mastered').length;

  return (
    <MetricCard
      title="Skill Mastery"
      icon="medal"
      loading={loading}
      style={style}
      accessibilityLabel={
        skills.length > 0
          ? `Skill mastery. ${mastered} of ${skills.length} skills mastered. ${visible
              .map((s) => `${s.name}, ${humanizeState(s.state)}, ${Math.round(s.score)} percent`)
              .join('. ')}.`
          : 'Skill mastery. No skills tracked yet.'
      }
      footer={
        hidden > 0 && onViewAll ? (
          <SecondaryButton
            label={`View all ${skills.length} skills`}
            icon="chart"
            size="sm"
            onPress={onViewAll}
            style={styles.viewAll}
          />
        ) : null
      }
      footnote={hidden > 0 && !onViewAll ? `${hidden} more not shown` : undefined}
      skeleton={
        <View style={styles.skeleton}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width="70%" height={12} />
              <Skeleton variant="rect" width="100%" height={progressSizes.barHeightThin} />
            </View>
          ))}
        </View>
      }
    >
      {visible.map((skill, i) => (
        <ProgressIndicator
          key={skill.name}
          value={skill.score}
          height={progressSizes.barHeightThin}
          color={STATE_COLORS[skill.state] ?? colors.textMuted}
          label={`${skill.name} · ${humanizeState(skill.state)}`}
          showPercentage
          style={i > 0 ? styles.row : undefined}
          accessibilityLabel={`${skill.name}, ${humanizeState(skill.state)}`}
        />
      ))}
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.md,
  },
  skeletonRow: {
    gap: spacing.xs,
  },
  row: {
    marginTop: spacing.md,
  },
  viewAll: {
    marginTop: spacing.lg,
  },
});

export default SkillMasteryCard;
