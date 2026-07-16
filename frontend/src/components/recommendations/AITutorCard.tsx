import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface AITutorCardProps {
  title: string;
  topic?: string;
  status: 'active' | 'completed';
  messageCount?: number;
  onResume?: () => void;
  onStart?: () => void;
  style?: ViewStyle;
  loading?: boolean;
}

export const AITutorCard: React.FC<AITutorCardProps> = ({
  title,
  topic,
  status,
  messageCount,
  onResume,
  onStart,
  style,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card style={[styles.card, style]}>
        <View style={styles.skeletonHeader}>
          <Skeleton variant="circle" width={40} height={40} />
          <View style={styles.skeletonText}>
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={12} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
        <Skeleton width={90} height={14} style={{ marginTop: spacing.sm }} />
        <Skeleton width={100} height={36} style={{ marginTop: spacing.md }} />
      </Card>
    );
  }

  const isActive = status === 'active';

  return (
    <Card
      style={[styles.card, style]}
      accessibilityLabel={`AI Tutor: ${title}, ${status}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubbles" size={22} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {topic && <Text style={styles.topic} numberOfLines={1}>{topic}</Text>}
        </View>
        <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.textMuted }]} />
      </View>

      {messageCount !== undefined && (
        <View style={styles.messageRow}>
          <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.textMuted} />
          <Text style={styles.messageCount}>{messageCount} messages</Text>
        </View>
      )}

      {isActive && onResume ? (
        <View style={styles.actionBtn}>
          <Ionicons name="play" size={14} color={colors.primary} />
          <Text
            style={styles.actionText}
            accessibilityRole="button"
            accessibilityLabel="Resume AI Tutor session"
            onPress={onResume}
          >
            Resume
          </Text>
        </View>
      ) : null}

      {!isActive && onStart ? (
        <View style={styles.actionBtn}>
          <Ionicons name="play" size={14} color={colors.primary} />
          <Text
            style={styles.actionText}
            accessibilityRole="button"
            accessibilityLabel="Start AI Tutor session"
            onPress={onStart}
          >
            Start
          </Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  topic: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  messageCount: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  actionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});
