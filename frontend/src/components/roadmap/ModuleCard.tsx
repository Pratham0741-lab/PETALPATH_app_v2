import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows, iconSizes } from '../../theme';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { Skeleton } from '../ui/Skeleton';

interface LessonItem {
  id: string;
  title: string;
  difficulty: string;
  isCompleted: boolean;
  isUnlocked: boolean;
}

interface ModuleCardProps {
  title: string;
  description?: string | null;
  lessonsCount: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  lessons?: LessonItem[];
  onLessonPress?: (lessonId: string) => void;
  loading?: boolean;
}

const difficultyColor = (difficulty: string) => {
  switch (difficulty.toUpperCase()) {
    case 'EASY':
      return { bg: colors.successLight, fg: colors.leafGreen };
    case 'MEDIUM':
      return { bg: colors.warningLight, fg: colors.warning };
    case 'HARD':
      return { bg: colors.errorLight, fg: colors.error };
    default:
      return { bg: colors.surfaceSecondary, fg: colors.textSecondary };
  }
};

export const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  description,
  lessonsCount,
  isCompleted,
  isUnlocked,
  lessons,
  onLessonPress,
  loading,
}) => {
  const handleLessonPress = useCallback(
    (lessonId: string) => {
      onLessonPress?.(lessonId);
    },
    [onLessonPress],
  );

  if (loading) {
    return (
      <Card variant="flat" padding="md" style={styles.skeletonCard}>
        <Skeleton variant="rect" width="60%" height={18} style={styles.skelMargin} />
        <Skeleton variant="text" width="90%" height={12} style={styles.skelMargin} />
        <Skeleton variant="text" width="30%" height={12} />
      </Card>
    );
  }

  return (
    <Card
      variant="flat"
      padding="md"
      style={[styles.card, isCompleted && styles.cardCompleted, !isUnlocked && styles.cardLocked]}
      accessibilityLabel={`${title}, ${lessonsCount} lessons`}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          {isCompleted ? (
            <Ionicons name="checkmark-circle" size={iconSizes.md} color={colors.green} />
          ) : isUnlocked ? (
            <Ionicons name="book" size={iconSizes.md} color={colors.primary} />
          ) : (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={iconSizes.md} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text
            style={[styles.title, !isUnlocked && styles.textLocked]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={[styles.description, !isUnlocked && styles.textLocked]}
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </View>

      {isUnlocked && lessons && lessons.length > 0 && (
        <View style={styles.lessonList}>
          {lessons.map((lesson) => {
            const diffColor = difficultyColor(lesson.difficulty);
            return (
              <Pressable
                key={lesson.id}
                onPress={lesson.isUnlocked ? () => handleLessonPress(lesson.id) : undefined}
                disabled={!lesson.isUnlocked}
                style={({ pressed }) => [
                  styles.lessonItem,
                  pressed && lesson.isUnlocked && styles.lessonItemPressed,
                  !lesson.isUnlocked && styles.lessonItemLocked,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.title}, ${lesson.difficulty}`}
              >
                <View style={styles.lessonLeft}>
                  {lesson.isCompleted ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                  ) : lesson.isUnlocked ? (
                    <Ionicons name="play-circle" size={18} color={colors.primary} />
                  ) : (
                    <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
                  )}
                  <Text
                    style={[
                      styles.lessonTitle,
                      !lesson.isUnlocked && styles.textLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {lesson.title}
                  </Text>
                </View>
                <Chip
                  label={lesson.difficulty}
                  size="sm"
                  variant={
                    lesson.difficulty.toUpperCase() === 'EASY'
                      ? 'success'
                      : lesson.difficulty.toUpperCase() === 'MEDIUM'
                        ? 'warning'
                        : 'error'
                  }
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {isUnlocked && lessons && lessons.length === 0 && (
        <Text style={styles.emptyLessons}>No lessons yet</Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  skeletonCard: {
    marginBottom: spacing.sm,
  },
  skelMargin: {
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  cardCompleted: {
    borderLeftColor: colors.success,
  },
  cardLocked: {
    borderLeftColor: colors.border,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  lockOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  description: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeights.sm,
  },
  textLocked: {
    color: colors.textMuted,
  },
  lessonList: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  lessonItemPressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  lessonItemLocked: {
    opacity: 0.6,
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  lessonTitle: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: typography.families.rounded,
    flexShrink: 1,
  },
  emptyLessons: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
});
