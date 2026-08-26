/**
 * AchievementCard — one achievement row in the Achievements list.
 *
 * Redesign notes (§5, §7, §15): the Ionicons trophy is an `IconWell` with the
 * `trophy` glyph, the hand-rolled "Completed" pill is the shared `StatusBadge`,
 * and `AppCard`/`ProgressBar` are the design-system `Card`/`ProgressIndicator`
 * so achievements match the rewards screen that links to them (§35).
 *
 * Two contrast fixes came along with it: the old "Completed" text used
 * `colors.success` on `successLight` (about 2:1) and the description used
 * `textMuted` for the only sentence explaining what the achievement is. Both now
 * use readable pairs (§30). Props and the 0-100 progress maths are unchanged.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../../../theme';
import { Card, IconWell, ProgressIndicator, StatusBadge } from '../../design';

interface AchievementCardProps {
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  category?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  name,
  description,
  progress,
  target,
  completed,
  category,
  onPress,
  style,
}) => {
  const percent = target > 0 ? (progress / target) * 100 : 0;

  return (
    <Card
      variant={completed ? 'selected' : 'raised'}
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityLabel={
        completed
          ? `${name}, completed. ${description}`
          : `${name}, ${progress} of ${target}. ${description}`
      }
    >
      <View style={styles.header}>
        <IconWell
          icon="trophy"
          color={completed ? colors.warningDark : colors.textMuted}
          soft={completed ? colors.yellowSoft : colors.skeleton}
          size={44}
          filled={completed}
        />
        <View style={styles.titleWrap}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          {category ? (
            <Text style={styles.category} numberOfLines={1}>
              {category}
            </Text>
          ) : null}
        </View>
        {completed ? (
          <StatusBadge status="completed" label="Done" size="sm" />
        ) : (
          <Text style={styles.counter}>
            {progress}/{target}
          </Text>
        )}
      </View>

      <Text style={styles.description}>{description}</Text>

      <ProgressIndicator
        value={percent}
        color={completed ? colors.success : colors.accent}
        style={styles.progress}
        accessibilityLabel={`${Math.round(percent)} percent complete`}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.presets.cardTitle,
    color: colors.text,
  },
  category: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  counter: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.bold,
  },
  description: {
    ...typography.presets.subtle,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  progress: {
    marginTop: spacing.sm,
  },
});

export default AchievementCard;
