import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { useLearningHistory } from '../../hooks/useParentAnalytics';
import type { TimelineEvent } from '../../services/api/analyticsApi';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';

type EventType = TimelineEvent['type'];

const EVENT_ICON_CONFIG: Record<EventType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  LESSON_COMPLETED: { name: 'checkmark-circle', color: '#4CAF50' },
  ASSESSMENT_COMPLETED: { name: 'clipboard', color: '#2196F3' },
  REWARD_EARNED: { name: 'star', color: '#FFC107' },
  VIDEO_WATCHED: { name: 'play-circle', color: '#F44336' },
};

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[date.getDay()];
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((todayStart.getTime() - eventStart.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[date.getDay()];
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

interface DateSection {
  title: string;
  data: TimelineEvent[];
}

function TimelineSkeleton({ themeColors }: { themeColors: Record<string, string> }) {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.header}>
        <Skeleton variant="circle" width={36} height={36} />
        <Skeleton width={160} height={24} style={{ marginLeft: spacing.sm }} />
      </View>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} variant="card" height={90} style={{ marginTop: spacing.md }} />
      ))}
    </View>
  );
}

export const LearningHistoryScreen: React.FC = () => {
  const { theme: { colors: themeColors } } = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();

  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useLearningHistory(page);

  useEffect(() => {
    if (data?.data) {
      const result = data.data;
      if (page === 1) {
        setEvents(result.data);
      } else {
        setEvents((prev) => [...prev, ...result.data]);
      }
      setPagination(result.pagination);
    }
  }, [data, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setEvents([]);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const sections = useMemo<DateSection[]>(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    for (const event of events) {
      const label = getDateLabel(event.timestamp);
      if (!groups[label]) groups[label] = [];
      groups[label].push(event);
    }
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [events]);

  const hasMore = pagination.page < pagination.totalPages;

  const renderSectionHeader = useCallback(
    ({ section }: { section: DateSection }) => (
      <View style={[styles.dateHeader, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.dateHeaderText, { color: themeColors.text }]} accessibilityRole="header">
          {section.title}
        </Text>
      </View>
    ),
    [themeColors],
  );

  const renderEventCard = useCallback(
    ({ item }: { item: TimelineEvent }) => {
      const iconConfig = EVENT_ICON_CONFIG[item.type];
      return (
        <Card variant="flat" style={styles.eventCard} accessibilityLabel={`${item.type} event: ${item.title}`}>
          <View style={styles.eventRow}>
            <View style={[styles.eventIconWrap, { backgroundColor: `${iconConfig.color}18` }]}>
              <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
            </View>
            <View style={styles.eventContent}>
              <Text style={[styles.eventTitle, { color: themeColors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.eventTime, { color: themeColors.textSecondary }]}>
                {formatRelativeTime(item.timestamp)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.textMuted} />
          </View>
        </Card>
      );
    },
    [themeColors],
  );

  const keyExtractor = useCallback((item: TimelineEvent) => item.id, []);

  if (isLoading && page === 1) {
    return (
      <ScreenContainer>
        <TimelineSkeleton themeColors={themeColors} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.primary}18` }]}>
              <Ionicons name="time" size={24} color={themeColors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Learning History</Text>
          </View>
          <ErrorState
            title="Couldn't load learning history"
            message={(error as Error)?.message ?? 'An error occurred loading your history.'}
            onRetry={() => refetch()}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!isLoading && events.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.primary}18` }]}>
              <Ionicons name="time" size={24} color={themeColors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Learning History</Text>
          </View>
          <EmptyState
            icon="📖"
            title="No learning history yet"
            message="Start a lesson to see your progress!"
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderEventCard}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        accessibilityLabel="Learning History Timeline"
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.primary}18` }]}>
              <Ionicons name="time" size={24} color={themeColors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Learning History</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {isFetching && page > 1 && (
              <View style={styles.loadingMore}>
                <Skeleton variant="text" width={120} height={16} />
              </View>
            )}
            {hasMore && !isFetching && (
              <Button
                title="Load More"
                variant="outline"
                onPress={loadMore}
                fullWidth
                style={styles.loadMoreButton}
                accessibilityLabel="Load more learning history events"
              />
            )}
          </View>
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  centerContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  skeletonContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
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
  dateHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingTop: spacing.lg,
  },
  dateHeaderText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  eventTime: {
    fontSize: typography.sizes.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadMoreButton: {
    marginTop: spacing.sm,
  },
});
