import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ReinforcementCard } from '../../components/recommendations/ReinforcementCard';
import { useReinforcementDue, useReinforcementHistory, useReinforcementActions } from '../../hooks/useIntelligence';
import type { ReinforcementItem } from '../../services/api/intelligenceApi';

const SEGMENTS = ['Due Now', 'Due Soon', 'History'];

function ReinforcementSkeleton() {
  return (
    <View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton width={120} height={16} />
          <Skeleton width={80} height={12} style={{ marginTop: spacing.xs }} />
          <Skeleton width="100%" height={8} style={{ marginTop: spacing.sm }} />
          <View style={styles.skeletonActions}>
            <Skeleton width={70} height={32} />
            <Skeleton width={60} height={32} style={{ marginLeft: spacing.sm }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ReinforcementQueueScreen() {
  const { theme: { colors: themeColors } } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    data: dueData,
    isLoading: dueLoading,
    isError: dueError,
    refetch: refetchDue,
    isFetching: dueFetching,
  } = useReinforcementDue();

  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
    isFetching: historyFetching,
  } = useReinforcementHistory();

  const actions = useReinforcementActions();

  const isFetching = dueFetching || historyFetching;
  const isLoading = dueLoading || historyLoading;
  const isError = dueError || historyError;

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchDue(), refetchHistory()]);
  }, [refetchDue, refetchHistory]);

  const dueNowItems = (dueData?.data as ReinforcementItem[] | undefined ?? [])
    .filter((item) => item.status === 'due_now');
  const dueSoonItems = (dueData?.data as ReinforcementItem[] | undefined ?? [])
    .filter((item) => item.status === 'due_soon');
  const historyItems = historyData?.data as ReinforcementItem[] | undefined ?? [];

  const currentItems = selectedIndex === 0 ? dueNowItems : selectedIndex === 1 ? dueSoonItems : historyItems;
  const isEmpty = currentItems.length === 0 && !isLoading;

  const handleStart = useCallback((itemId: string) => {
    actions.start.mutate(itemId);
  }, [actions.start]);

  const handleSkip = useCallback((itemId: string) => {
    actions.skip.mutate(itemId);
  }, [actions.skip]);

  const handleComplete = useCallback((itemId: string) => {
    actions.complete.mutate(itemId);
  }, [actions.complete]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
          accessibilityLabel="Loading reinforcement queue"
        >
          <View style={styles.header}>
            <Skeleton variant="circle" width={36} height={36} />
            <Skeleton width={140} height={24} style={{ marginLeft: spacing.sm }} />
          </View>
          <Skeleton width="100%" height={40} style={{ marginBottom: spacing.lg }} />
          <ReinforcementSkeleton />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <ErrorState
            title="Couldn't load reinforcement queue"
            message="An error occurred loading reinforcement data."
            onRetry={onRefresh}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        accessibilityLabel="Reinforcement Queue Screen"
      >
        <View style={styles.header}>
          <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.secondary}18` }]}>
            <Ionicons name="refresh-outline" size={24} color={themeColors.secondary} />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Reinforcement</Text>
        </View>

        <View style={styles.segmentWrapper}>
          <SegmentedControl
            segments={SEGMENTS}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            size="md"
          />
        </View>

        {!isEmpty && (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionCount, { color: themeColors.textMuted }]}>
              {currentItems.length} item{currentItems.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${themeColors.success}18` }]}>
              <Ionicons name="checkmark-circle-outline" size={48} color={themeColors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>All caught up!</Text>
            <Text style={[styles.emptyMessage, { color: themeColors.textMuted }]}>
              No skills need reinforcement.
            </Text>
          </View>
        ) : (
          <View accessibilityLabel={`${SEGMENTS[selectedIndex]} items`} accessibilityRole="list">
            {currentItems.map((item) => (
              <ReinforcementCard
                key={item.id}
                skillName={item.skillName}
                priority={item.priority}
                status={item.status}
                dueDate={item.dueDate}
                strengthBefore={item.strengthBefore}
                onStart={item.status === 'due_now' ? () => handleStart(item.id) : undefined}
                onSkip={item.status === 'due_now' || item.status === 'due_soon' ? () => handleSkip(item.id) : undefined}
                onComplete={item.status !== 'completed' && item.status !== 'snoozed' ? () => handleComplete(item.id) : undefined}
              />
            ))}
          </View>
        )}

        {actions.start.isPending || actions.skip.isPending || actions.complete.isPending ? (
          <View style={styles.loadingOverlay}>
            <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Updating...</Text>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.md,
  },
  segmentWrapper: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionCount: {
    fontSize: typography.sizes.sm,
  },
  skeletonCard: {
    padding: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.md,
  },
  skeletonActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  emptyMessage: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    color: 'inherit',
  },
  loadingOverlay: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
  },
});
