import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, StyleProp } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';

interface ContinueLearningCardProps {
  categoryTitle: string;
  lessonTitle: string;
  nextActivityTitle: string;
  progressPercent: number; // 0 to 100
  onPressPlay?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ContinueLearningCard: React.FC<ContinueLearningCardProps> = ({
  categoryTitle,
  lessonTitle,
  nextActivityTitle,
  progressPercent,
  onPressPlay,
  style,
}) => {
  return (
    <AppCard style={[styles.card, style]}>
      {/* Background Gradient Effect via nested views */}
      <View style={styles.gradientOverlay} />

      <View style={styles.content}>
        {/* Label */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>CONTINUE LEARNING</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{categoryTitle}</Text>
          </View>
        </View>

        {/* Lesson & Next Activity */}
        <Text style={styles.lessonTitle}>{lessonTitle}</Text>
        <Text style={styles.nextText}>Next: {nextActivityTitle}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(Math.max(progressPercent, 0), 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progressPercent}% Complete</Text>
        </View>

        {/* Play Button */}
        <Pressable
          style={({ pressed }) => [
            styles.playButton,
            pressed && styles.playButtonPressed,
          ]}
          onPress={onPressPlay}
        >
          <Ionicons name="play" size={18} color={colors.white} />
          <Text style={styles.playButtonText}>Start Activity</Text>
        </Pressable>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E2356', // Custom premium navy gradient start
    borderWidth: 1,
    borderColor: '#3B82F640',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.blue,
    opacity: 0.08,
  },
  content: {
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.blue,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
  },
  badge: {
    backgroundColor: '#2563EB30',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#3B82F650',
  },
  badgeText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  lessonTitle: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    marginBottom: spacing.xs,
  },
  nextText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.lg,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.blue,
    borderRadius: radius.full,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  playButton: {
    flexDirection: 'row',
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    ...shadows.sm,
  },
  playButtonPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: '#7C3AED',
  },
  playButtonText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.sm,
  },
});
