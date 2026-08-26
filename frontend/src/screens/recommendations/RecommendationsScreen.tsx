import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { useChildStore } from '../../store/childStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { getRecommendation, type LearnerRecommendation } from '../../api/recommendations';
import { toUserMessage } from '../../api/errors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

const modalityIcon: Record<string, IconName> = {
  VIDEO: 'videocam',
  AUDIO: 'ear',
  SPEECH: 'chatbubble-ellipses',
  WRITING: 'create',
  GAME: 'game-controller',
  STORY: 'book',
  MOTOR: 'hand-left',
  CREATIVE: 'color-palette',
  WARMUP: 'flash',
  REWARD: 'gift',
};

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const RecommendationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();
  const activeChild = useChildStore((state) => state.activeChild);
  const childId = activeChild?.id;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['recommendation', childId],
    queryFn: () => getRecommendation(childId as string),
    enabled: !!childId,
  });

  useFocusEffect(
    React.useCallback(() => {
      if (childId) {
        refetch();
      }
    }, [childId, refetch]),
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const recommendation: LearnerRecommendation | undefined = data?.data;
  const childName = activeChild?.name ?? 'your child';

  const renderBody = () => {
    if (isLoading) {
      return <LoadingSpinner label="Finding the best next step…" />;
    }

    if (isError) {
      return (
        <ErrorState
          title="Couldn't load recommendation"
          message={toUserMessage(error)}
          onRetry={onRefresh}
        />
      );
    }

    if (!recommendation) {
      return (
        <EmptyState
          icon="💡"
          title="No recommendation yet"
          message="We don't have a suggestion right now. Check back after a learning session."
        />
      );
    }

    const activityIcon = modalityIcon[recommendation.activityType] ?? 'bulb';
    const confidencePct = Math.round((recommendation.confidence ?? 0) * 100);

    return (
      <AppCard style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{titleCase(recommendation.kind)}</Text>
          </View>
          <View style={styles.activityChip}>
            <Ionicons name={activityIcon} size={16} color={colors.primary} />
            <Text style={styles.activityChipText}>
              {titleCase(recommendation.activityType)}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Recommended next step for {childName}</Text>
        <Text style={styles.reason}>{recommendation.reasonText}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.metaLabel}>Session length</Text>
            <Text style={styles.metaValue}>{recommendation.optimalSessionDurationMin} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
            <Text style={styles.metaLabel}>Confidence</Text>
            <Text style={styles.metaValue}>{confidencePct}%</Text>
          </View>
        </View>

        <Text style={styles.generated}>
          Generated {formatTime(recommendation.computedAt)}
        </Text>
      </AppCard>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="bulb" size={26} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Smart Recommendation</Text>
          <Text style={styles.headerSubtitle}>
            A personalized next step chosen by {childName}'s learning companion.
          </Text>
        </View>

        {!childId ? (
          <EmptyState
            icon="👶"
            title="Select a child"
            message="Choose a child profile to see their personalized recommendation."
          />
        ) : (
          renderBody()
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    marginTop: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    color: colors.surface,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  activityChipText: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  reason: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metaItem: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  generated: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});

export default RecommendationsScreen;
