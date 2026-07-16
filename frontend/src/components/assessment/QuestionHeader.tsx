import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface Props {
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
}

export const QuestionHeader: React.FC<Props> = ({
  questionNumber,
  totalQuestions,
  prompt,
}) => {
  return (
    <View style={styles.container}>
      {totalQuestions > 0 && (
        <Text style={styles.meta}>
          Question {questionNumber} of {totalQuestions}
        </Text>
      )}
      <Text style={styles.prompt}>{prompt}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  meta: {
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.xs,
  },
  prompt: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    lineHeight: typography.lineHeights.xl,
  },
});

export default QuestionHeader;
