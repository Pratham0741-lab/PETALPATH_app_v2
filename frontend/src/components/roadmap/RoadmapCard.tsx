import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  AccessibilityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows, iconSizes } from '../../theme';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';

interface ModuleItem {
  id: string;
  title: string;
  lessonsCount: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

interface RoadmapCardProps {
  title: string;
  description?: string | null;
  modulesCount: number;
  lessonsCompleted: number;
  lessonsCount: number;
  stars: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onModulePress?: (moduleId: string) => void;
  modules?: ModuleItem[];
  loading?: boolean;
}

const progressPercent = (completed: number, total: number) =>
  total > 0 ? (completed / total) * 100 : 0;

export const RoadmapCard: React.FC<RoadmapCardProps> = ({
  title,
  description,
  modulesCount,
  lessonsCompleted,
  lessonsCount,
  stars,
  isCompleted,
  isUnlocked,
  isExpanded,
  onToggle,
  onModulePress,
  modules,
  loading,
}) => {
  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(expandAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded, expandAnim, rotateAnim]);

  const maxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleModulePress = useCallback(
    (moduleId: string) => {
      onModulePress?.(moduleId);
    },
    [onModulePress],
  );

  if (loading) {
    return (
      <Card variant="outlined" padding="lg" style={styles.skeletonCard}>
        <Skeleton variant="rect" width="70%" height={22} style={styles.skelMargin} />
        <Skeleton variant="text" width="100%" height={14} style={styles.skelMargin} />
        <Skeleton variant="text" width="40%" height={14} style={styles.skelMargin} />
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      padding="lg"
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        !isUnlocked && styles.cardLocked,
      ]}
      accessibilityLabel={`${title}, ${lessonsCompleted} of ${lessonsCount} lessons completed`}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !isUnlocked && styles.titleLocked]} numberOfLines={2}>
              {title}
            </Text>
            {isCompleted && (
              <Ionicons name="checkmark-circle" size={iconSizes.sm} color={colors.green} />
            )}
            {!isUnlocked && (
              <Ionicons name="lock-closed" size={iconSizes.sm} color={colors.textMuted} />
            )}
          </View>
          {description ? (
            <Text style={[styles.description, !isUnlocked && styles.textLocked]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Chip
              label={`${modulesCount} module${modulesCount !== 1 ? 's' : ''}`}
              size="sm"
              variant="default"
            />
            <View style={styles.starRow}>
              <Ionicons name="star" size={14} color={colors.yellow} />
              <Text style={styles.starText}>{stars}</Text>
            </View>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={iconSizes.md} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>

      <View style={styles.progressSection}>
        <ProgressBar
          progress={progressPercent(lessonsCompleted, lessonsCount)}
          variant={isCompleted ? 'success' : 'primary'}
          height={8}
        />
        <Text style={styles.progressLabel}>
          {lessonsCompleted} / {lessonsCount} lessons
        </Text>
      </View>

      <Animated.View style={[styles.moduleContainer, { maxHeight, overflow: 'hidden' }]}>
        <View style={styles.moduleList}>
          {modules && modules.length > 0 ? (
            modules.map((mod) => (
              <Pressable
                key={mod.id}
                onPress={mod.isUnlocked ? () => handleModulePress(mod.id) : undefined}
                disabled={!mod.isUnlocked}
                style={({ pressed }) => [
                  styles.moduleItem,
                  pressed && mod.isUnlocked && styles.moduleItemPressed,
                  !mod.isUnlocked && styles.moduleItemLocked,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${mod.title}, ${mod.lessonsCount} lessons`}
              >
                <View style={styles.moduleIcon}>
                  {mod.isCompleted ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                  ) : mod.isUnlocked ? (
                    <Ionicons name="book" size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
                  )}
                </View>
                <View style={styles.moduleInfo}>
                  <Text
                    style={[styles.moduleTitle, !mod.isUnlocked && styles.textLocked]}
                    numberOfLines={1}
                  >
                    {mod.title}
                  </Text>
                  <Text style={styles.moduleLessonCount}>
                    {mod.lessonsCount} lesson{mod.lessonsCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                {mod.isUnlocked && (
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyModules}>No modules yet</Text>
          )}
        </View>
      </Animated.View>
    </Card>
  );
};

const styles = StyleSheet.create({
  skeletonCard: {
    marginBottom: spacing.md,
  },
  skelMargin: {
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardCompleted: {
    borderColor: colors.success,
  },
  cardLocked: {
    opacity: 0.75,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    flexShrink: 1,
  },
  titleLocked: {
    color: colors.textMuted,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
    lineHeight: typography.lineHeights.sm,
  },
  textLocked: {
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  progressSection: {
    marginTop: spacing.md,
  },
  progressLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
  },
  moduleContainer: {
    marginTop: spacing.sm,
  },
  moduleList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  moduleItemPressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  moduleItemLocked: {
    opacity: 0.6,
  },
  moduleIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  moduleInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  moduleTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  moduleLessonCount: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: 1,
  },
  emptyModules: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
