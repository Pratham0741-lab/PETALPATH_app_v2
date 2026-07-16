import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  questionType: 'TEXT' | 'FILL_BLANK';
  value: string;
  onChange: (value: string) => void;
  isReview?: boolean;
  correctAnswer?: string | null;
}

export const AnswerInput: React.FC<Props> = ({
  questionType,
  value,
  onChange,
  isReview,
  correctAnswer,
}) => {
  const isMultiline = questionType === 'TEXT';
  const isWrong = isReview && correctAnswer !== undefined && correctAnswer !== null && value !== correctAnswer;

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          isMultiline && styles.multiline,
          isReview && {
            borderColor: isWrong ? colors.error : colors.success,
            backgroundColor: isWrong ? colors.errorLight : colors.successLight,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={isMultiline ? 'Type your answer...' : 'Fill in the blank...'}
        placeholderTextColor={colors.textMuted}
        multiline={isMultiline}
        numberOfLines={isMultiline ? 3 : 1}
        textAlignVertical={isMultiline ? 'top' : 'center'}
        editable={!isReview}
      />
      {isReview && correctAnswer !== null && correctAnswer !== undefined && (
        <Text style={[styles.correctAnswer, isWrong && styles.wrongText]}>
          Correct answer: {correctAnswer}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.text,
    fontFamily: typography.families.rounded,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  multiline: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  correctAnswer: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.small,
    color: colors.success,
    fontFamily: typography.families.rounded,
  },
  wrongText: {
    color: colors.error,
  },
});

export default AnswerInput;
