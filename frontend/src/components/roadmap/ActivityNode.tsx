import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, iconSizes } from '../../theme';

type ActivityType = 'video' | 'listen' | 'speak' | 'write' | 'quiz' | 'story' | 'game' | 'ai_tutor' | 'drag_drop';

interface ActivityNodeProps {
  id: string;
  title: string;
  activityType: ActivityType;
  isCompleted: boolean;
  onPress: () => void;
}

const activityConfig: Record<ActivityType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  video: { icon: 'videocam', color: '#5D8FD7', label: 'Video' },
  listen: { icon: 'headset', color: '#8B78D8', label: 'Listen' },
  speak: { icon: 'mic', color: '#F2A15F', label: 'Speak' },
  write: { icon: 'create', color: '#8DBB75', label: 'Write' },
  quiz: { icon: 'help-circle', color: '#F7C94B', label: 'Quiz' },
  story: { icon: 'book', color: '#F6B5C5', label: 'Story' },
  game: { icon: 'game-controller', color: '#B89DE8', label: 'Game' },
  ai_tutor: { icon: 'bulb', color: '#F29A8F', label: 'AI Tutor' },
  drag_drop: { icon: 'hand-left', color: '#F59E0B', label: 'Drag & Drop' },
};

export const ActivityNode: React.FC<ActivityNodeProps> = ({
  id,
  title,
  activityType,
  isCompleted,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = activityConfig[activityType] ?? activityConfig.video;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${config.label} activity${isCompleted ? ', completed' : ''}`}
        style={({ pressed }) => [
          styles.container,
          isCompleted && styles.completed,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.typeIcon, { backgroundColor: config.color + '18' }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.typeLabel}>{config.label}</Text>
        </View>

        <View
          style={[
            styles.checkbox,
            isCompleted && styles.checkboxCompleted,
          ]}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color={colors.white} />
          ) : (
            <Ionicons name="play" size={16} color={colors.primary} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completed: {
    borderColor: colors.success,
    opacity: 0.85,
  },
  pressed: {
    opacity: 0.8,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
    marginBottom: 2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  typeLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
});
