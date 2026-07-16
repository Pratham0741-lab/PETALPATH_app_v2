import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../../theme';

interface StreakIndicatorProps {
  streak: number;
  size?: number;
}

const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, size = 16 }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="flame" size={size} color={colors.warning} />
      <Text style={[styles.text, { fontSize: size * 0.8 }]}>{streak}</Text>
      <View style={[styles.badge, { width: size / 2, height: size / 2, borderRadius: size / 4 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginLeft: spacing.xs / 2,
  },
  badge: {
    backgroundColor: colors.warning,
    marginLeft: spacing.xs / 2,
  },
});

export default StreakIndicator;
