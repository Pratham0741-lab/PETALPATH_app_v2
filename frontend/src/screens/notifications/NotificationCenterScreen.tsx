import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
} from '../../hooks/useNotifications';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

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

const typeIcon: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  LESSON_COMPLETED: 'school',
  ASSESSMENT_COMPLETED: 'clipboard',
  REWARD_EARNED: 'star',
  MILESTONE: 'trophy',
  REMINDER: 'alarm',
  SYSTEM: 'information-circle',
  GENERAL: 'notifications',
};

export const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useNotifications(page);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();

  const notifications = data?.data ?? [];
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

  const handleLongPress = useCallback(
    (id: string) => {
      Alert.alert('Delete Notification', 'Remove this notification?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) },
      ]);
    },
    [handleDelete],
  );

  const renderNotification = (item: any) => {
    const iconName = typeIcon[item.type] ?? 'notifications';
    const isUnread = !item.isRead;

    return (
      <Pressable
        key={item.id}
        onPress={() => handleMarkRead(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        style={({ pressed }) => [
          styles.notifItem,
          isUnread && styles.notifUnread,
          pressed && styles.notifPressed,
        ]}
      >
        <View style={[styles.notifIcon, isUnread && styles.notifIconUnread]}>
          <Ionicons name={iconName} size={20} color={isUnread ? colors.purple : colors.textMuted} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  if (isLoading && page === 1) {
    return (
      <ScreenContainer>
        <TopBar title="Notifications" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Loading notifications…" />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <TopBar title="Notifications" showBack />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load notifications"
            message={toUserMessage(error)}
            onRetry={onRefresh}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TopBar title="Notifications" showBack />
      <View style={styles.actionRow}>
        <AppButton
          label="Mark All Read"
          onPress={handleMarkAllRead}
          variant="secondary"
          loading={markAllRead.isPending}
          disabled={notifications.length === 0 || notifications.every((n: any) => n.isRead)}
          style={styles.markAllBtn}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.purple} />
        }
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No notifications yet"
            message="When you get notifications, they will appear here."
          />
        ) : (
          <>
            {notifications.map(renderNotification)}

            {pagination && pagination.totalPages > 1 && (
              <View style={styles.paginationRow}>
                <AppButton
                  label="Previous"
                  variant="secondary"
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  style={styles.paginationBtn}
                />
                <Text style={styles.pageInfo}>
                  Page {pagination.page} of {pagination.totalPages}
                </Text>
                <AppButton
                  label="Next"
                  variant="secondary"
                  disabled={page >= pagination.totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  style={styles.paginationBtn}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  markAllBtn: {
    minWidth: 140,
    height: 40,
  },
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifUnread: {
    backgroundColor: `${colors.purple}08`,
  },
  notifPressed: {
    opacity: 0.7,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notifIconUnread: {
    backgroundColor: `${colors.purple}15`,
  },
  notifContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  notifTitleUnread: {
    fontWeight: typography.weights.bold,
  },
  notifTime: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  notifBody: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.purple,
    marginTop: 6,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  paginationBtn: {
    minWidth: 100,
    height: 40,
  },
  pageInfo: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});

export default NotificationCenterScreen;
