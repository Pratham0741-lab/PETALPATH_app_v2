import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows, iconSizes } from '../../theme';
import { Chip } from '../ui/Chip';

interface LessonNodeProps {
  id: string;
  title: string;
  difficulty: string;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  xpReward?: number;
  estimatedDuration?: number;
  onPress: () => void;
}

const difficultyColor = (difficulty: string) => {
  switch (difficulty.toUpperCase()) {
    case 'EASY':
      return 'success';
    case 'MEDIUM':
      return 'warning';
    case 'HARD':
      return 'error';
    default:
      return 'default';
  }
};

export const LessonNode: React.FC<LessonNodeProps> = ({
  id,
  title,
  difficulty,
  isCompleted,
  isUnlocked,
  isCurrent,
  xpReward,
  estimatedDuration,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const isActive = isUnlocked || isCurrent;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={isActive ? onPress : undefined}
        onPressIn={isActive ? handlePressIn : undefined}
        onPressOut={isActive ? handlePressOut : undefined}
        disabled={!isActive}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${difficulty}${isCurrent ? ', current lesson' : ''}${isCompleted ? ', completed' : ''}`}
        accessibilityState={{ disabled: !isActive }}
        style={({ pressed }) => [
          styles.container,
          isCompleted && styles.completed,
          isCurrent && styles.current,
          !isActive && styles.locked,
          pressed && isActive && styles.pressed,
        ]}
      >
        <View style={styles.statusIcon}>
          {isCompleted ? (
            <View style={[styles.iconCircle, styles.iconCompleted]}>
              <Ionicons name="checkmark" size={18} color={colors.white} />
            </View>
          ) : isCurrent ? (
            <View style={[styles.iconCircle, styles.iconCurrent]}>
              <Ionicons name="play" size={16} color={colors.white} />
            </View>
          ) : isUnlocked ? (
            <View style={[styles.iconCircle, styles.iconUnlocked]}>
              <Ionicons name="lock-open" size={16} color={colors.primary} />
            </View>
          ) : (
            <View style={[styles.iconCircle, styles.iconLocked]}>
              <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text
            style={[styles.title, !isActive && styles.titleLocked]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={styles.badgeRow}>
            <Chip label={difficulty} size="sm" variant={difficultyColor(difficulty)} />
            {estimatedDuration ? (
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.durationText}>{estimatedDuration} min</Text>
              </View>
            ) : null}
          </View>
        </View>

        {xpReward && isActive ? (
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={12} color={colors.yellow} />
            <Text style={styles.xpText}>{xpReward}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  completed: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  current: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
    ...shadows.sm,
  },
  locked: {
    opacity: 0.6,
    borderColor: colors.borderLight,
  },
  pressed: {
    opacity: 0.85,
  },
  statusIcon: {
    marginRight: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCompleted: {
    backgroundColor: colors.green,
  },
  iconCurrent: {
    backgroundColor: colors.primary,
  },
  iconUnlocked: {
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  iconLocked: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.xs,
  },
  titleLocked: {
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  durationText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.yellow + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    gap: 2,
  },
  xpText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
});
