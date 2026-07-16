import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { ProgressBar } from '../../../components/ui';

interface Props {
  progress: number;
  target: number;
  label?: string;
}

export const ChallengeProgress: React.FC<Props> = ({ progress, target, label }) => {
  const percent = target > 0 ? (progress / target) * 100 : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {progress}/{target} {label ?? ''}
      </Text>
      <View style={styles.barWrap}>
        <ProgressBar progress={percent} color={colors.blue} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
  },
  text: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  barWrap: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
});
