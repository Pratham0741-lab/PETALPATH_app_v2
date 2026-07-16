import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface RecommendationData {
  kind: string;
  activityType: string;
  reasonText: string;
  confidence: number;
  optimalSessionDurationMin: number;
}

interface RecommendationCardProps {
  recommendation: RecommendationData | null;
  loading?: boolean;
  onAction?: () => void;
}

const ACTIVITY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  VIDEO: 'videocam',
  AUDIO: 'musical-notes',
  READING: 'book',
  GAME: 'game-controller',
  QUIZ: 'help-circle',
  PRACTICE: 'construct',
  STORY: 'bookmarks',
  ART: 'color-palette',
};

const ACTIVITY_LABELS: Record<string, string> = {
  VIDEO: 'Video',
  AUDIO: 'Audio',
  READING: 'Reading',
  GAME: 'Game',
  QUIZ: 'Quiz',
  PRACTICE: 'Practice',
  STORY: 'Story',
  ART: 'Art',
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  loading = false,
  onAction,
}) => {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Skeleton width={140} height={16} />
        <Skeleton width="100%" height={14} style={{ marginTop: spacing.sm }} />
        <Skeleton width="90%" height={14} style={{ marginTop: spacing.xs }} />
        <Skeleton width={80} height={12} style={{ marginTop: spacing.sm }} />
        <Skeleton width={110} height={40} style={{ marginTop: spacing.md }} />
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card style={styles.card}>
        <View style={styles.emptyContent}>
          <Ionicons name="bulb-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyText}>No recommendation available yet.</Text>
          <Text style={styles.emptySubtext}>
            Complete more lessons to get personalized recommendations.
          </Text>
        </View>
      </Card>
    );
  }

  const activityIcon = ACTIVITY_ICONS[recommendation.activityType] ?? 'bulb';
  const activityLabel = ACTIVITY_LABELS[recommendation.activityType] ?? recommendation.activityType;
  const confidencePct = Math.round(recommendation.confidence * 100);

  return (
    <Card
      style={styles.card}
      accessibilityLabel={`Recommendation: ${activityLabel}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={activityIcon} size={20} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>AI Recommendation</Text>
          <Text style={styles.activityLabel}>{activityLabel}</Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: `${colors.success}18` }]}>
          <Text style={styles.confidenceText}>{confidencePct}%</Text>
        </View>
      </View>

      <Text style={styles.reasonText}>{recommendation.reasonText}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={styles.metaText}>
          {recommendation.optimalSessionDurationMin} min session
        </Text>
        <View style={styles.kindBadge}>
          <Text style={styles.kindText}>{recommendation.kind}</Text>
        </View>
      </View>

      {onAction && (
        <Button
          label="Start"
          onPress={onAction}
          variant="primary"
          size="sm"
          style={styles.actionBtn}
          accessibilityLabel="Start recommended activity"
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: `${colors.accent}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activityLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  confidenceText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  reasonText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeights.sm,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    marginRight: spacing.sm,
  },
  kindBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  kindText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  actionBtn: {
    alignSelf: 'flex-end',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default RecommendationCard;
