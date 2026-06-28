import React from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';
import { Lesson } from '../../store/roadmapStore';

interface LessonNodeProps {
  lesson: Lesson;
  isLocked: boolean;
  isCompleted: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const LessonNode: React.FC<LessonNodeProps> = ({
  lesson,
  isLocked,
  isCompleted,
  onPress,
  style,
}) => {
  const getDifficultyColor = () => {
    switch (lesson.difficulty) {
      case 'EASY':
        return colors.green;
      case 'MEDIUM':
        return colors.yellow;
      case 'HARD':
        return colors.coral;
      default:
        return colors.green;
    }
  };

  const difficultyColor = getDifficultyColor();

  return (
    <AppCard
      onPress={isLocked ? undefined : onPress}
      style={[
        styles.card,
        isLocked && styles.cardLocked,
        isCompleted && styles.cardCompleted,
        style,
      ]}
    >
      <View style={styles.container}>
        {/* Status Indicator / Icon */}
        <View
          style={[
            styles.iconContainer,
            isLocked
              ? styles.iconLocked
              : isCompleted
              ? styles.iconCompleted
              : styles.iconUnlocked,
          ]}
        >
          <Ionicons
            name={
              isLocked
                ? 'lock-closed'
                : isCompleted
                ? 'checkmark-circle'
                : 'play'
            }
            size={24}
            color={
              isLocked
                ? colors.textMuted
                : isCompleted
                ? colors.green
                : '#FFF8ED'
            }
          />
        </View>

        {/* Content Info */}
        <View style={styles.info}>
          <Text
            style={[
              styles.title,
              isLocked && styles.textLocked,
              isCompleted && styles.textCompleted,
              { fontFamily: typography.families.rounded }
            ]}
          >
            {lesson.title}
          </Text>
          {lesson.description && !isLocked ? (
            <Text style={[styles.description, { fontFamily: typography.families.rounded }]} numberOfLines={2}>
              {lesson.description}
            </Text>
          ) : null}

          {/* Difficulty badge (unlocked only) */}
          {!isLocked ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: difficultyColor + '20', borderColor: difficultyColor },
              ]}
            >
              <Text style={[styles.badgeText, { color: difficultyColor, fontFamily: typography.families.rounded }]}>
                {lesson.difficulty}
              </Text>
            </View>
          ) : (
            <Text style={[styles.lockedText, { fontFamily: typography.families.rounded }]}>Locked</Text>
          )}
        </View>

        {!isLocked && (
          <Ionicons
            name="chevron-forward"
            size={22}
            color={isCompleted ? colors.green : colors.textMuted}
          />
        )}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardLocked: {
    opacity: 0.5,
    backgroundColor: '#F8EEDC80',
    borderColor: colors.border,
  },
  cardCompleted: {
    borderColor: colors.green + '80',
    backgroundColor: '#EBF6E0', // soft light green background
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconLocked: {
    backgroundColor: colors.border,
  },
  iconCompleted: {
    backgroundColor: colors.green + '20',
  },
  iconUnlocked: {
    backgroundColor: colors.blue,
  },
  info: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginBottom: 2,
  },
  textLocked: {
    color: colors.textMuted,
  },
  textCompleted: {
    color: colors.text,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.small,
    marginBottom: spacing.xs,
  },
  lockedText: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontStyle: 'italic',
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
});
export default LessonNode;
