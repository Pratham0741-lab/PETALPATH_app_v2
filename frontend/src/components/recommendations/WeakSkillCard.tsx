import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { ProgressBar } from '../ui/ProgressBar';

interface WeakSkillCardProps {
  skillName: string;
  domain: string;
  masteryScore: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  onPractice?: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

const priorityColors: Record<string, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

const priorityLabels: Record<string, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
};

export const WeakSkillCard: React.FC<WeakSkillCardProps> = ({
  skillName,
  domain,
  masteryScore,
  gap,
  priority,
  onPractice,
  loading = false,
  style,
}) => {
  if (loading) {
    return (
      <Card style={[styles.card, style]}>
        <Skeleton width={130} height={16} />
        <Skeleton width={90} height={12} style={{ marginTop: spacing.xs }} />
        <Skeleton width="100%" height={8} style={{ marginTop: spacing.sm }} />
        <Skeleton width={70} height={12} style={{ marginTop: spacing.xs }} />
        <Skeleton width={100} height={36} style={{ marginTop: spacing.md }} />
      </Card>
    );
  }

  return (
    <Card
      style={[styles.card, style]}
      accessibilityLabel={`Weak skill: ${skillName}, priority: ${priority}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.skillName} numberOfLines={1}>{skillName}</Text>
          <Text style={styles.domain}>{domain}</Text>
        </View>
        <View style={[styles.priorityDot, { backgroundColor: priorityColors[priority] }]} />
      </View>

      <ProgressBar
        progress={masteryScore}
        height={8}
        color={masteryScore < 40 ? colors.error : masteryScore < 70 ? colors.warning : colors.success}
        style={{ marginTop: spacing.sm }}
      />

      <View style={styles.gapRow}>
        <Text style={styles.gapLabel}>Gap</Text>
        <Text style={styles.gapValue}>{Math.round(gap)}%</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.priorityLabel}>{priorityLabels[priority]}</Text>
        {onPractice && (
          <View style={styles.practiceBtn}>
            <Ionicons name="construct-outline" size={14} color={colors.primary} />
            <Text
              style={styles.practiceText}
              accessibilityRole="button"
              accessibilityLabel={`Practice ${skillName}`}
              onPress={onPractice}
            >
              Practice
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  skillName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  domain: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  gapLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  gapValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  priorityLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  practiceText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});
