/**
 * Notification centre — pushed from the bell in the top bar.
 *
 * Redesign notes (§5, §7, §28, §30):
 *
 *  - The seven Ionicons glyphs in `typeIcon` are `PetalIcon` names now, and each
 *    type carries its own colour identity (a completed lesson is green, a reward
 *    is yellow, a milestone purple) drawn on an `IconWell` rather than a
 *    hand-rolled circle with a `${colors.primary}15` fill.
 *  - Rows are design-system `Card`s instead of a divided list. Unread is signalled
 *    three ways — a raised card against a flat one, a bold title, and a dot — so
 *    it does not depend on colour. The old unread tint was `${colors.primary}08`,
 *    a 3% alpha wash that is invisible on `#FFF8FA`, which left the small dot
 *    doing all the work.
 *  - Deleting was long-press only, with nothing on screen to suggest it. There is
 *    a real trash button per row now; the long-press shortcut still works.
 *  - `AppButton` gives way to `SecondaryButton`, the `🔔` emoji `EmptyState` icon
 *    to the `notifications` glyph, and the empty state is wrapped in `StatePanel`
 *    so its `flex: 1` centring has a height to fill inside the scroll view.
 *  - The unused `useNavigation` call is gone.
 *
 * The queries, mutations, pagination and `formatTime` behaviour are unchanged.
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Alert } from 'react-native';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Card, IconButton, IconWell, SecondaryButton, StatePanel } from '../../components/design';
import { PetalIconName } from '../../components/icons';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
} from '../../hooks/useNotifications';
import { toUserMessage } from '../../api/errors';
import { colors, radius, spacing, typography, cardSizes } from '../../theme';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Icon plus colour per notification type. The colours follow the activity
 * identity from §15 where they overlap, so a reward reads yellow here and in the
 * rewards tab.
 */
const TYPE_STYLE: Record<string, { icon: PetalIconName; color: string; soft: string }> = {
  LESSON_COMPLETED: { icon: 'book', color: colors.successDark, soft: colors.greenSoft },
  ASSESSMENT_COMPLETED: { icon: 'check', color: colors.blueDark, soft: colors.blueSoft },
  REWARD_EARNED: { icon: 'star', color: colors.warningDark, soft: colors.yellowSoft },
  MILESTONE: { icon: 'trophy', color: colors.purpleDark, soft: colors.secondaryLight },
  REMINDER: { icon: 'clock', color: colors.primaryDark, soft: colors.primaryLight },
  SYSTEM: { icon: 'info', color: colors.textSecondary, soft: colors.skeleton },
  GENERAL: { icon: 'notifications', color: colors.textSecondary, soft: colors.skeleton },
};

const FALLBACK_STYLE = TYPE_STYLE.GENERAL;

export const NotificationCenterScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useNotifications(page);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();

  const notifications: NotificationItem[] = data?.data ?? [];
  const pagination = data?.pagination;

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleMarkRead = useCallback(
    (id: string) => {
      markRead.mutate(id);
    },
    [markRead],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotif.mutate(id);
    },
    [deleteNotif],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete Notification', 'Remove this notification?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) },
      ]);
    },
    [handleDelete],
  );

  const renderNotification = (item: NotificationItem) => {
    const style = TYPE_STYLE[item.type] ?? FALLBACK_STYLE;
    const isUnread = !item.isRead;
    const time = formatTime(item.createdAt);

    return (
      <Card
        key={item.id}
        variant={isUnread ? 'raised' : 'flat'}
        padding="compact"
        style={styles.notifCard}
        onPress={isUnread ? () => handleMarkRead(item.id) : undefined}
        onLongPress={() => confirmDelete(item.id)}
        accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${item.title}. ${item.message}. ${time}`}
        accessibilityHint={isUnread ? 'Marks this notification as read' : undefined}
      >
        <View style={styles.notifRow}>
          <IconWell
            icon={style.icon}
            color={style.color}
            soft={style.soft}
            size={cardSizes.iconWellSmall}
            filled={isUnread}
          />

          <View style={styles.notifContent}>
            <View style={styles.notifHeader}>
              {isUnread ? <View style={styles.unreadDot} /> : null}
              <Text
                style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>
            <Text style={styles.notifBody} numberOfLines={3}>
              {item.message}
            </Text>
            <Text style={styles.notifTime}>{time}</Text>
          </View>

          <IconButton
            icon="trash"
            size="sm"
            tone="danger"
            variant="plain"
            onPress={() => confirmDelete(item.id)}
            accessibilityLabel={`Delete notification: ${item.title}`}
            accessibilityHint="Asks you to confirm first"
          />
        </View>
      </Card>
    );
  };

  if (isLoading && page === 1) {
    return (
      <ScreenContainer>
        <TopBar title="Notifications" showBack />
        <StatePanel bare minHeight={320}>
          <LoadingSpinner label="Loading notifications…" />
        </StatePanel>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <TopBar title="Notifications" showBack />
        <StatePanel bare minHeight={320}>
          <ErrorState
            title="Couldn't load notifications"
            message={toUserMessage(error)}
            onRetry={onRefresh}
          />
        </StatePanel>
      </ScreenContainer>
    );
  }

  const allRead = notifications.length === 0 || notifications.every((n) => n.isRead);

  return (
    <ScreenContainer>
      <TopBar title="Notifications" showBack />

      {notifications.length > 0 ? (
        <View style={styles.actionRow}>
          <SecondaryButton
            label="Mark all read"
            icon="check"
            size="sm"
            fill="soft"
            fullWidth={false}
            onPress={handleMarkAllRead}
            loading={markAllRead.isPending}
            disabled={allRead}
          />
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {notifications.length === 0 ? (
          <StatePanel>
            <EmptyState
              icon="notifications"
              title="No notifications yet"
              message="When you get notifications, they will appear here."
            />
          </StatePanel>
        ) : (
          <>
            {notifications.map(renderNotification)}

            {pagination && pagination.totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <SecondaryButton
                  label="Previous"
                  icon="back"
                  size="sm"
                  fullWidth={false}
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Text style={styles.pageInfo}>
                  {pagination.page} / {pagination.totalPages}
                </Text>
                <SecondaryButton
                  label="Next"
                  iconRight="forward"
                  size="sm"
                  fullWidth={false}
                  disabled={page >= pagination.totalPages}
                  onPress={() => setPage((p) => p + 1)}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  notifCard: {
    marginBottom: spacing.sm,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  notifTitle: {
    ...typography.presets.body,
    color: colors.text,
    flexShrink: 1,
  },
  notifTitleUnread: {
    fontWeight: typography.weights.bold,
  },
  notifBody: {
    ...typography.presets.subtle,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notifTime: {
    ...typography.presets.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  pageInfo: {
    ...typography.presets.subtle,
    color: colors.textSecondary,
  },
});

export default NotificationCenterScreen;
