import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { AppCard } from '../cards/AppCard';

interface Props {
  hasTakenPlacement: boolean;
  percentage?: number | null;
  lastAttemptDate?: string | null;
  recommendedLevel?: string | null;
  onPress: () => void;
}

export const PlacementCard: React.FC<Props> = ({
  hasTakenPlacement,
  percentage,
  lastAttemptDate,
  recommendedLevel,
  onPress,
}) => {
  return (
    <AppCard>
      <Text style={styles.title}>
        {hasTakenPlacement ? 'Placement Assessment' : 'Placement Assessment'}
      </Text>
      {hasTakenPlacement && percentage != null ? (
        <View style={styles.scoreRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.green} />
          <Text style={styles.scoreText}>{Math.round(percentage)}%</Text>
        </View>
      ) : (
        <Text style={styles.prompt}>
          Take a quick assessment to determine your starting level.
        </Text>
      )}
      {recommendedLevel ? (
        <Text style={styles.level}>
          Recommended Level: <Text style={styles.levelBold}>{recommendedLevel}</Text>
        </Text>
      ) : null}
      {lastAttemptDate ? (
        <Text style={styles.date}>Last attempt: {lastAttemptDate}</Text>
      ) : null}
      <Pressable style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>
          {hasTakenPlacement ? 'View Results' : 'Take Placement'}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.white} />
      </Pressable>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  prompt: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoreText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.green,
    marginLeft: spacing.sm,
  },
  level: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  levelBold: {
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  date: {
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    gap: spacing.sm,
  },
  ctaText: {
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});

export default PlacementCard;
