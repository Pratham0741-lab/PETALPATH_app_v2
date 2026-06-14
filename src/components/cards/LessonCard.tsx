import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import { AppCard } from './AppCard';
import { ProgressBar } from '../progress/ProgressBar';
import { Ionicons } from '@expo/vector-icons';

export type LessonStatus = 'completed' | 'in_progress' | 'locked';

interface LessonCardProps {
  title: string;
  subtitle: string;
  status: LessonStatus;
  progress: number; // 0 to 1
  starsCount: number;
  maxStars: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  title,
  subtitle,
  status,
  progress,
  starsCount,
  maxStars,
  onPress,
  style,
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'completed':
        return { backgroundColor: colors.green + '20', color: colors.green };
      case 'in_progress':
        return { backgroundColor: colors.purple + '20', color: colors.purple };
      case 'locked':
        return { backgroundColor: colors.background, color: colors.textMuted };
    }
  };

  const badge = getBadgeStyle();

  return (
    <AppCard
      onPress={status !== 'locked' ? onPress : undefined}
      style={[
        styles.card,
        status === 'locked' && styles.lockedCard,
        status === 'in_progress' && styles.inProgressCard,
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <Text style={[styles.subtitle, status === 'locked' && styles.mutedText]}>{subtitle}</Text>
          <Text style={[styles.title, status === 'locked' && styles.mutedText]}>{title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.backgroundColor }]}>
          {status === 'completed' && <Ionicons name="checkmark-circle" size={16} color={colors.green} />}
          {status === 'in_progress' && <Ionicons name="play" size={16} color={colors.purple} />}
          {status === 'locked' && <Ionicons name="lock-closed" size={16} color={colors.textMuted} />}
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {status === 'completed' && 'Done'}
            {status === 'in_progress' && 'Go!'}
            {status === 'locked' && 'Locked'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressArea}>
          <ProgressBar progress={progress} height={8} style={styles.progressBar} color={status === 'completed' ? colors.green : colors.purple} />
        </View>
        <View style={styles.starValueContainer}>
          <Ionicons name="star" size={14} color={status === 'locked' ? colors.textMuted : colors.yellow} style={styles.starIcon} />
          <Text style={[styles.starText, status === 'locked' && styles.mutedText]}>
            {starsCount}/{maxStars}
          </Text>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
  inProgressCard: {
    borderColor: colors.purple,
    borderWidth: 2,
  },
  lockedCard: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  titleArea: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
  },
  mutedText: {
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressArea: {
    flex: 1,
    marginRight: spacing.xl,
  },
  progressBar: {
    marginTop: spacing.xs,
  },
  starValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: spacing.xs,
  },
  starText: {
    color: colors.yellow,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
