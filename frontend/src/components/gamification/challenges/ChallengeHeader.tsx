import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';

interface Props {
  title: string;
  subtitle?: string;
  day?: string;
}

export const ChallengeHeader: React.FC<Props> = ({ title, subtitle, day }) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        {day ? (
          <View style={styles.dayPill}>
            <Text style={styles.dayText}>{day}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  dayPill: {
    backgroundColor: colors.blue + '1A',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  dayText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.blue,
  },
  subtitle: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
