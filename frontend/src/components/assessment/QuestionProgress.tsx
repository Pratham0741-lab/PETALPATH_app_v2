import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { ProgressBar } from '../ui';

interface Props {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

export const QuestionProgress: React.FC<Props> = ({
  currentIndex,
  totalQuestions,
  answeredCount,
}) => {
  const progress = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0;

  return (
    <View style={styles.container}>
      <ProgressBar
        progress={progress}
        color={colors.purple}
        showPercentage
      />
      <Text style={styles.stats}>
        {answeredCount} of {totalQuestions} answered
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  stats: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    textAlign: 'right',
  },
});

export default QuestionProgress;
