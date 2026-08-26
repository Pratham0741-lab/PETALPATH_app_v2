import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { spacing, colors, typography, cardSizes } from '../../theme';
import { useLearningHistory } from '../../hooks/useParentAnalytics';
import type { TimelineEvent } from '../../services/api/analyticsApi';
import {
  AppShell,
  Card,
  IconWell,
  PageHeader,
  SecondaryButton,
} from '../../components/design';
import type { PetalIconName } from '../../components/design';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';

/**
 * Learning History (spec §26) — everything the child has finished, newest first.
 *
 * Paging, grouping and the two time formatters are untouched. What changed: the
 * four event colours were hardcoded Material hexes (#4CAF50, #2196F3, #FFC107,
 * #F44336) and their glyphs came from Ionicons — both are tokens and `PetalIcon`
 * now (§3, §7). Each row also had a `chevron-forward` on a card with no
 * `onPress`, which promised a detail screen that does not exist (§33); it is
 * gone. And the row used to announce itself as "LESSON_COMPLETED event: …", the
 * raw enum — it now says "Lesson completed: {title}, 2h ago".
 */

type EventType = TimelineEvent['type'];

interface EventVisual {
  icon: PetalIconName;
  color: string;
  soft: string;
  /** Spoken (and never shown) — the row's title says the rest. */
  spoken: string;
}

const EVENT_VISUALS: Record<EventType, EventVisual> = {
  LESSON_COMPLETED: {
    icon: 'check',
    color: colors.successDark,
    soft: colors.greenSoft,
    spoken: 'Lesson completed',
  },
  ASSESSMENT_COMPLETED: {
    icon: 'medal',
    color: colors.blue,
    soft: colors.blueSoft,
    spoken: 'Assessment completed',
  },
  REWARD_EARNED: {
    icon: 'star',
    color: colors.accent,
    soft: colors.yellowSoft,
    spoken: 'Reward earned',
  },
  VIDEO_WATCHED: {
    icon: 'watch',
    color: colors.primary,
    soft: colors.primaryLight,
    spoken: 'Video watched',
  },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  if (diffDays < 7) return DAY_NAMES[date.getDay()];
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
  if (diffDays < 7) return DAY_NAMES[date.getDay()];
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

interface DateSection {
  title: string;
  data: TimelineEvent[];
}

export const LearningHistoryScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useLearningHistory(page);

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
      <View style={styles.dateHeader}>
        <Text style={[typography.presets.eyebrow, styles.dateHeaderText]} accessibilityRole="header">
          {section.title}
        </Text>
      </View>
    ),
    [],
  );

  const renderEventCard = useCallback(
    ({ item }: { item: TimelineEvent }) => <EventRow event={item} />,
    [],
  );

  const keyExtractor = useCallback((item: TimelineEvent) => item.id, []);

  const header = (
    <PageHeader
      title="Learning History"
      subtitle={pagination.total > 0 ? `${pagination.total} events, newest first` : 'Newest first'}
      centered={false}
    />
  );

  if (isLoading && page === 1) {
    return (
      <AppShell petals="light" header={header}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="card" height={84} style={styles.skeletonRow} />
        ))}
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <ErrorState
            title="Couldn't load learning history"
            message={(error as Error)?.message ?? 'An error occurred loading your history.'}
            onRetry={() => refetch()}
          />
        </StatePanel>
      </AppShell>
    );
  }

  if (events.length === 0) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <EmptyState
            icon="book"
            title="No learning history yet"
            message="Start a lesson to see your progress!"
          />
        </StatePanel>
      </AppShell>
    );
  }

  return (
    <AppShell petals="light" scroll={false} padded={false} header={header}>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderEventCard}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        accessibilityLabel="Learning history timeline"
        ListFooterComponent={
          <View style={styles.footer}>
            {isFetching && page > 1 ? (
              <View style={styles.loadingMore}>
                <Skeleton variant="text" width={120} height={16} />
              </View>
            ) : null}
            {hasMore && !isFetching ? (
              <SecondaryButton
                label="Load More"
                icon="arrowDown"
                onPress={loadMore}
                accessibilityLabel="Load more learning history events"
              />
            ) : null}
          </View>
        }
      />
    </AppShell>
  );
};

/** One finished thing. Not tappable — there is no detail screen behind it. */
const EventRow: React.FC<{ event: TimelineEvent }> = ({ event }) => {
  const v = EVENT_VISUALS[event.type];
  const when = formatRelativeTime(event.timestamp);

  return (
    <Card variant="flat" padding="compact" style={styles.eventCard}>
      <View
        style={styles.eventRow}
        accessible
        accessibilityLabel={`${v.spoken}: ${event.title}, ${when}`}
      >
        <IconWell icon={v.icon} color={v.color} soft={v.soft} size={cardSizes.iconWellSmall} />
        <View style={styles.eventContent}>
          <Text style={[typography.presets.body, styles.eventTitle]} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={[typography.presets.caption, styles.eventTime]}>{when}</Text>
        </View>
      </View>
    </Card>
  );
};

/**
 * `EmptyState` and `ErrorState` centre themselves with `flex: 1`, which collapses
 * inside a scroll view's auto-height content — the minimum height gives it room.
 */
const StatePanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card variant="flat" padding="none">
    <View style={styles.panel}>{children}</View>
  </Card>
);

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  panel: {
    minHeight: 240,
    paddingVertical: spacing.md,
  },
  skeletonRow: {
    marginBottom: spacing.sm,
  },

  /* The sticky header spans the full width, so its padding is its own rather
     than the list's — an inset background would leave the rows showing through
     the gutters as it passes underneath. */
  dateHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dateHeaderText: {
    color: colors.textSecondary,
  },

  eventCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eventTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  eventTime: {
    color: colors.textSecondary,
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
});

export default LearningHistoryScreen;
