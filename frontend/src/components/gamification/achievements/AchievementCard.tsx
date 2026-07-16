import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { ProgressBar } from '../../../components/ui';

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
    <AppCard
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.header}>
        <Ionicons
          name="trophy"
          size={28}
          color={completed ? colors.orange : colors.textMuted}
        />
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{name}</Text>
          {category ? <Text style={styles.category}>{category}</Text> : null}
        </View>
        {completed ? (
          <View style={styles.completedPill}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <Text style={styles.counter}>
            {progress}/{target}
          </Text>
        )}
      </View>
      <Text style={styles.description}>{description}</Text>
      <ProgressBar
        progress={percent}
        color={colors.orange}
        style={styles.progress}
      />
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  category: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginTop: spacing.xs / 2,
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  completedText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.success,
    marginLeft: spacing.xs / 2,
  },
  counter: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  description: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  progress: {
    marginTop: spacing.sm,
  },
});

export default AchievementCard;
