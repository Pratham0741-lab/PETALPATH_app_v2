import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Pressable } from 'react-native';
import { colors, radius, spacing, shadows } from '../../theme';

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  outlined?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({ children, style, onPress, outlined = true }) => {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          outlined && styles.outlined,
          { transform: [{ scale: pressed ? 0.96 : 1.0 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, outlined && styles.outlined, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  outlined: {
    borderColor: colors.border,
  },
});
export default AppCard;
