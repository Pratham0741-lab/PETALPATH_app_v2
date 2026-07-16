import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Divider } from '../../components/ui/Divider';
import { useAITutorSessions } from '../../hooks/useIntelligence';
import { colors, spacing, typography, radius } from '../../theme';
import type { AITutorSession } from '../../services/api/intelligenceApi';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function computeStats(sessions: AITutorSession[]) {
  let totalMessages = 0;
  let totalMastery = 0;
  for (const s of sessions) {
    totalMessages += s.messages.length;
    totalMastery += s.masteryGained ?? 0;
  }
  return {
    totalSessions: sessions.length,
    totalMessages,
    totalMastery: Math.round(totalMastery),
  };
}

interface HistoryItemProps {
  session: AITutorSession;
  onResume: (sessionId: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ session, onResume }) => {
  const [expanded, setExpanded] = useState(false);
  const isActive = session.status === 'active';

  return (
    <Card
      style={styles.historyCard}
      accessibilityLabel={`Session: ${session.topic}, ${session.status}`}
    >
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse session details' : 'Expand session details'}
        style={styles.historyHeader}
      >
        <View style={styles.historyIcon}>
          <Ionicons
            name={isActive ? 'chatbubble-ellipses' : 'chatbubble-outline'}
            size={20}
            color={isActive ? colors.success : colors.textMuted}
          />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyTopic} numberOfLines={1}>
            {session.topic}
          </Text>
          <View style={styles.historyMeta}>
            <Text style={styles.historyDate}>{formatDate(session.startedAt)}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.historyDuration}>
              {formatDuration(session.duration)}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isActive
                ? `${colors.success}20`
                : `${colors.textMuted}20`,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isActive ? colors.success : colors.textMuted,
              },
            ]}
          />
          <Text
            style={[
              styles.statusLabel,
              { color: isActive ? colors.success : colors.textMuted },
            ]}
          >
            {isActive ? 'Active' : 'Done'}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <Divider style={{ marginVertical: spacing.sm }} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Messages</Text>
            <Text style={styles.detailValue}>{session.messages.length}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mastery Gained</Text>
            <Text style={styles.detailValue}>
              {session.masteryGained ?? 0}%
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Started</Text>
            <Text style={styles.detailValue}>
              {formatTime(session.startedAt)}
            </Text>
          </View>
          {session.completedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed</Text>
              <Text style={styles.detailValue}>
                {formatTime(session.completedAt)}
              </Text>
            </View>
          )}
          {session.messages.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>Preview</Text>
              {session.messages.slice(0, 2).map((msg) => (
                <View key={msg.id} style={styles.previewRow}>
                  <Text style={styles.previewRole}>
                    {msg.role === 'ai' ? 'AI' : 'You'}:
                  </Text>
                  <Text style={styles.previewText} numberOfLines={2}>
                    {msg.content}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {isActive && (
            <Pressable
              onPress={() => onResume(session.id)}
              style={styles.resumeRow}
              accessibilityRole="button"
              accessibilityLabel={`Resume session ${session.topic}`}
            >
              <Ionicons name="play" size={16} color={colors.primary} />
              <Text style={styles.resumeText}>Resume Session</Text>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
};

export const AITutorHistoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const { data, isLoading, isError, refetch, isFetching } = useAITutorSessions();
  const sessions = data?.data ?? [];

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  const handleResume = useCallback(
    (sessionId: string) => {
      navigation.navigate('AITutorChat', { sessionId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: AITutorSession }) => (
      <HistoryItem session={item} onResume={handleResume} />
    ),
    [handleResume],
  );

  const keyExtractor = useCallback(
    (item: AITutorSession) => item.id,
    [],
  );

  const renderListHeader = () => (
    <View style={styles.statsRow}>
      <Card style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.totalSessions}</Text>
        <Text style={styles.statLabel}>Sessions</Text>
      </Card>
      <Card style={styles.statCard}>
        <Text style={styles.statNumber}>{stats.totalMessages}</Text>
        <Text style={styles.statLabel}>Messages</Text>
      </Card>
      <Card style={styles.statCard}>
        <Text style={styles.statNumber}>+{stats.totalMastery}%</Text>
        <Text style={styles.statLabel}>Mastery</Text>
      </Card>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No sessions yet</Text>
        <Text style={styles.emptyMessage}>
          Start a conversation with the AI tutor to see your history here.
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.scrollContent, isTablet && styles.scrollContentTablet]}>
          <Skeleton width={160} height={24} style={{ marginBottom: spacing.lg }} />
          <View style={styles.statsRow}>
            <Skeleton variant="rect" width="30%" height={70} />
            <Skeleton variant="rect" width="30%" height={70} />
            <Skeleton variant="rect" width="30%" height={70} />
          </View>
          <Skeleton variant="card" height={100} style={{ marginTop: spacing.md }} />
          <Skeleton variant="card" height={100} style={{ marginTop: spacing.md }} />
          <Skeleton variant="card" height={100} style={{ marginTop: spacing.md }} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Could not load history"
            message="Failed to load session history."
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        data={sessions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.headerTitle} accessibilityRole="header">
                Session History
              </Text>
            </View>
            {sessions.length > 0 && renderListHeader()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  scrollContentTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyCard: {
    marginBottom: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyTopic: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  historyDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  historyDuration: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    marginRight: spacing.sm,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  expandedContent: {
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  previewSection: {
    marginTop: spacing.sm,
    backgroundColor: `${colors.primary}08`,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  previewLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  previewRole: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  previewText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1E4D3',
  },
  resumeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyMessage: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
});
