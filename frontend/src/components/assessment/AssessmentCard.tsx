import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { AppCard } from '../cards/AppCard';

interface Props {
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  questionCount: number;
  status?: 'not_started' | 'in_progress' | 'completed';
  onPress: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Start', color: colors.textMuted, bg: colors.surfaceSecondary },
  in_progress: { label: 'In Progress', color: colors.blue, bg: colors.surfaceSecondary },
  completed: { label: 'Completed', color: colors.green, bg: colors.surfaceSecondary },
};

export const AssessmentCard: React.FC<Props> = ({
  title,
  description,
  estimatedMinutes,
  questionCount,
  status = 'not_started',
  onPress,
}) => {
  const cfg = statusConfig[status];

  return (
    <AppCard onPress={onPress}>
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View style={styles.bottomRow}>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{estimatedMinutes} min</Text>
          <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} style={styles.metaIcon} />
          <Text style={styles.metaText}>{questionCount} questions</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.md,
    marginBottom: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginLeft: spacing.md,
  },
  metaText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  badgeText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
});

export default AssessmentCard;
