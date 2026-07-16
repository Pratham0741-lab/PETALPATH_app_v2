import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface DividerProps {
  text?: string;
  color?: string;
  thickness?: number;
  margin?: number;
  style?: StyleProp<ViewStyle>;
}

export const Divider: React.FC<DividerProps> = ({
  text,
  color = colors.divider,
  thickness = 1,
  margin = spacing.lg,
  style,
}) => {
  if (text) {
    return (
      <View
        style={[styles.withText, { marginVertical: margin }, style]}
      >
        <View style={[styles.line, { flex: 1, backgroundColor: color, height: thickness }]} />
        <Text style={styles.text}>{text}</Text>
        <View style={[styles.line, { flex: 1, backgroundColor: color, height: thickness }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: color,
          height: thickness,
          marginVertical: margin,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  line: {
    width: '100%',
  },
  withText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginHorizontal: spacing.md,
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
  },
});

export default Divider;
