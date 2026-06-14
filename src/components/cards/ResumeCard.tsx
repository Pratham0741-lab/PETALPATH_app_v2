import React from 'react';
import { StyleSheet, View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';

interface ResumeCardProps {
  lessonTitle: string;
  videoTitle: string;
  remainingTime: number; // in seconds
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ResumeCard: React.FC<ResumeCardProps> = ({
  lessonTitle,
  videoTitle,
  remainingTime,
  onPress,
  style,
}) => {
  const formatRemaining = (secs: number) => {
    if (secs <= 0) return 'Finished';
    const minutes = Math.ceil(secs / 60);
    return minutes === 1 ? '1 min left' : `${minutes} mins left`;
  };

  return (
    <AppCard onPress={onPress} style={[styles.card, style]}>
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <Text style={styles.badgeText}>Continue Watching</Text>
          <Text style={styles.lessonTitle}>{lessonTitle}</Text>
          <Text style={styles.videoTitle} numberOfLines={1}>{videoTitle}</Text>
          <Text style={styles.remainingText}>{formatRemaining(remainingTime)}</Text>
        </View>
        <View style={styles.playButton}>
          <Ionicons name="play" size={24} color={colors.white} style={styles.playIcon} />
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    backgroundColor: colors.purple + '08', // subtle purple tint
    borderColor: colors.purple + '30',
    borderWidth: 1.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  badgeText: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  lessonTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  videoTitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  remainingText: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  playIcon: {
    marginLeft: 3, // nudge for optical centering
  },
});
