import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../../theme';

interface EmotionCardProps {
  emotion?: string;
  label: string;
  emoji: string;
  selected?: boolean;
  onPress?: () => void;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const EmotionCard: React.FC<EmotionCardProps> = ({
  emotion,
  label,
  emoji,
  selected = false,
  onPress,
  size = 90,
  color = colors.peach,
  style,
}) => {
  const resolvedLabel = label ?? emotion ?? '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: size,
          height: size + 20,
          backgroundColor: color,
          borderColor: selected ? colors.purple : colors.border,
          borderWidth: selected ? 3 : 1.5,
        },
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {resolvedLabel}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.input,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    ...shadows.sm,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
  },
});

export default EmotionCard;
