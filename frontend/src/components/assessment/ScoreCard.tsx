import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  score: number;
  maxScore: number;
  percentage: number;
  showAnimation?: boolean;
}

const getScoreColor = (pct: number): string => {
  if (pct < 40) return colors.error;
  if (pct < 70) return colors.orange;
  return colors.green;
};

export const ScoreCard: React.FC<Props> = ({ score, maxScore, percentage, showAnimation }) => {
  const scoreColor = getScoreColor(percentage);

  return (
    <View style={styles.container}>
      <View style={[styles.circle, { borderColor: scoreColor }]}>
        <Text style={[styles.percentage, { color: scoreColor }]}>
          {Math.round(percentage)}%
        </Text>
      </View>
      <Text style={[styles.fraction, { color: scoreColor }]}>
        {score} / {maxScore}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  percentage: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  fraction: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
});

export default ScoreCard;
