import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, iconSizes } from '../../theme';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { CircularProgress } from '../ui/CircularProgress';
import { ProgressBar } from '../ui/ProgressBar';

interface MasteryCardProps {
  skillName: string;
  domain: string;
  subject: string;
  masteryScore: number;
  masteryState: 'locked' | 'in_progress' | 'mastered' | 'review';
  confidence: number;
  onPress?: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

const stateLabels: Record<string, string> = {
  locked: 'Locked',
  in_progress: 'In Progress',
  mastered: 'Mastered',
  review: 'Review',
};

const stateColors: Record<string, string> = {
  locked: colors.textMuted,
  in_progress: colors.secondary,
  mastered: colors.success,
  review: colors.warning,
};

export const MasteryCard: React.FC<MasteryCardProps> = ({
  skillName,
  domain,
  subject,
  masteryScore,
  masteryState,
  confidence,
  onPress,
  loading = false,
  style,
}) => {
  if (loading) {
    return (
      <Card style={[styles.card, style]}>
        <View style={styles.skeletonRow}>
          <Skeleton variant="circle" width={60} height={60} />
          <View style={styles.skeletonText}>
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={12} style={{ marginTop: spacing.xs }} />
            <Skeleton width={60} height={12} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
        <Skeleton width="100%" height={8} style={{ marginTop: spacing.sm }} />
      </Card>
    );
  }

  return (
    <Card
      style={[styles.card, style]}
      onPress={onPress}
      accessibilityLabel={`${skillName}, ${masteryState}: ${Math.round(masteryScore)}% mastered`}
    >
      <View style={styles.row}>
        <CircularProgress
          progress={masteryScore}
          size={iconSizes.xl}
          strokeWidth={5}
          color={stateColors[masteryState]}
          trackColor={colors.border}
        />
        <View style={styles.info}>
          <Text style={styles.skillName} numberOfLines={1}>{skillName}</Text>
          <Text style={styles.domain} numberOfLines={1}>{domain}</Text>
          <Text style={styles.subject} numberOfLines={1}>{subject}</Text>
          <View style={[styles.stateBadge, { backgroundColor: `${stateColors[masteryState]}20` }]}>
            <Text style={[styles.stateLabel, { color: stateColors[masteryState] }]}>
              {stateLabels[masteryState]}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.confidenceSection}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <ProgressBar
          progress={confidence}
          height={6}
          color={confidence > 70 ? colors.success : confidence > 40 ? colors.warning : colors.error}
          showPercentage
        />
      </View>
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
  skeletonText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  skillName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  domain: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subject: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  stateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    marginTop: spacing.xs,
  },
  stateLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  confidenceSection: {
    marginTop: spacing.md,
  },
  confidenceLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
