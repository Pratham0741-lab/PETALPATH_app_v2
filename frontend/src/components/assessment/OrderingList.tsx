import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  options: Array<{ label: string; value: string }> | null;
  selectedValue: string;
  onSelect: (value: string) => void;
  isReview?: boolean;
  correctAnswer?: string | null;
}

export const OrderingList: React.FC<Props> = ({
  options,
  selectedValue,
  onSelect,
  isReview,
  correctAnswer,
}) => {
  const isWrong = isReview && correctAnswer !== undefined && correctAnswer !== null && selectedValue !== correctAnswer;

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>Drag to reorder (enter order as comma-separated)</Text>
      <TextInput
        style={[
          styles.input,
          isReview && {
            borderColor: isWrong ? colors.error : colors.success,
            backgroundColor: isWrong ? colors.errorLight : colors.successLight,
          },
        ]}
        value={selectedValue}
        onChangeText={onSelect}
        placeholder="e.g., 3,1,4,2"
        placeholderTextColor={colors.textMuted}
        editable={!isReview}
      />
      {isReview && correctAnswer !== null && correctAnswer !== undefined && (
        <Text style={[styles.correctAnswer, isWrong && styles.wrongText]}>
          Correct order: {correctAnswer}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  instruction: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.md,
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

export default OrderingList;
