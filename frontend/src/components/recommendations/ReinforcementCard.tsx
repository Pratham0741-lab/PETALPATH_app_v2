import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { ProgressBar } from '../ui/ProgressBar';

interface ReinforcementCardProps {
  skillName: string;
  priority: 'high' | 'medium' | 'low';
  status: 'due_now' | 'due_soon' | 'completed' | 'snoozed';
  dueDate: string;
  strengthBefore: number;
  onStart?: () => void;
  onSkip?: () => void;
  onComplete?: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

const priorityColors: Record<string, string> = {
  high: colors.error,
  medium: colors.warning,
  low: colors.success,
};

const priorityLabels: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const statusLabels: Record<string, string> = {
  due_now: 'Due Now',
  due_soon: 'Due Soon',
  completed: 'Completed',
  snoozed: 'Snoozed',
};

const statusColors: Record<string, string> = {
  due_now: colors.error,
  due_soon: colors.warning,
  completed: colors.success,
  snoozed: colors.textMuted,
};

function formatDueDate(dueDate: string): string {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diffMs = due - now;

  if (diffMs <= 0) return 'Overdue';

  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `Due in ${diffMin}m`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Due in ${diffHr}h`;

  const diffDays = Math.round(diffHr / 24);
  if (diffDays < 7) return `Due in ${diffDays}d`;

  return new Date(dueDate).toLocaleDateString();
}

export const ReinforcementCard: React.FC<ReinforcementCardProps> = ({
  skillName,
  priority,
  status,
  dueDate,
  strengthBefore,
  onStart,
  onSkip,
  onComplete,
  loading = false,
  style,
}) => {
  if (loading) {
    return (
      <Card style={[styles.card, style]}>
        <Skeleton width={130} height={16} />
        <Skeleton width={80} height={12} style={{ marginTop: spacing.xs }} />
        <Skeleton width="100%" height={8} style={{ marginTop: spacing.sm }} />
        <View style={[styles.skeletonRow, { marginTop: spacing.md }]}>
          <Skeleton width={70} height={32} />
          <Skeleton width={60} height={32} style={{ marginLeft: spacing.sm }} />
          <Skeleton width={90} height={32} style={{ marginLeft: spacing.sm }} />
        </View>
      </Card>
    );
  }

  const isTerminal = status === 'completed' || status === 'snoozed';

  return (
    <Card
      style={[styles.card, style]}
      accessibilityLabel={`Reinforcement: ${skillName}, ${statusLabels[status]}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.skillName} numberOfLines={1}>{skillName}</Text>
          <Text style={styles.dueText}>{formatDueDate(dueDate)}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: `${priorityColors[priority]}20` }]}>
            <Text style={[styles.badgeText, { color: priorityColors[priority] }]}>
              {priorityLabels[priority]}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${statusColors[status]}20`, marginLeft: spacing.xs }]}>
            <Text style={[styles.badgeText, { color: statusColors[status] }]}>
              {statusLabels[status]}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.strengthSection}>
        <Text style={styles.strengthLabel}>Strength before</Text>
        <ProgressBar
          progress={strengthBefore}
          height={8}
          color={strengthBefore < 40 ? colors.error : strengthBefore < 70 ? colors.warning : colors.success}
          showPercentage
        />
      </View>

      {!isTerminal && (
        <View style={styles.actions}>
          {onStart && (
            <View style={styles.actionBtn}>
              <Ionicons name="play" size={14} color={colors.success} />
              <Text
                style={[styles.actionText, { color: colors.success }]}
                accessibilityRole="button"
                accessibilityLabel="Start reinforcement"
                onPress={onStart}
              >
                Start
              </Text>
            </View>
          )}
          {onSkip && (
            <View style={styles.actionBtn}>
              <Ionicons name="close" size={14} color={colors.textMuted} />
              <Text
                style={[styles.actionText, { color: colors.textMuted }]}
                accessibilityRole="button"
                accessibilityLabel="Skip reinforcement"
                onPress={onSkip}
              >
                Skip
              </Text>
            </View>
          )}
          {onComplete && (
            <View style={styles.actionBtn}>
              <Ionicons name="checkmark" size={14} color={colors.primary} />
              <Text
                style={[styles.actionText, { color: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Complete reinforcement"
                onPress={onComplete}
              >
                Complete
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  skillName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  dueText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  strengthSection: {
    marginTop: spacing.md,
  },
  strengthLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.xs,
  },
});
