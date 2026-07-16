import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  questionType: 'MULTIPLE_CHOICE' | 'BOOLEAN' | 'MULTI_SELECT';
  options: Array<{ label: string; value: string }>;
  selectedValue: string;
  onSelect: (value: string) => void;
  isReview?: boolean;
  correctAnswer?: string | null;
}

export const ChoiceOption: React.FC<Props> = ({
  questionType,
  options,
  selectedValue,
  onSelect,
  isReview,
  correctAnswer,
}) => {
  const isMultiSelect = questionType === 'MULTI_SELECT';
  const selectedValues = isMultiSelect ? selectedValue.split(',').filter(Boolean) : [selectedValue];

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = isMultiSelect
          ? selectedValues.includes(option.value)
          : selectedValue === option.value;

        let borderColor = colors.border;
        let backgroundColor = colors.surface;
        let iconName: keyof typeof Ionicons.glyphMap | undefined;

        if (isReview) {
          const isCorrectOption = correctAnswer === option.value || correctAnswer?.split(',').includes(option.value);
          if (isSelected && isCorrectOption) {
            borderColor = colors.success;
            backgroundColor = colors.successLight;
            iconName = 'checkmark-circle';
          } else if (isSelected && !isCorrectOption) {
            borderColor = colors.error;
            backgroundColor = colors.errorLight;
            iconName = 'close-circle';
          } else if (!isSelected && isCorrectOption) {
            borderColor = colors.success;
            iconName = 'checkmark-circle-outline';
          }
        } else if (isSelected) {
          borderColor = colors.purple;
          backgroundColor = colors.surfaceSecondary;
        }

        const indicatorIcon = isSelected
          ? (isMultiSelect ? 'checkbox' : 'radio-button-on')
          : (isMultiSelect ? 'square-outline' : 'radio-button-off');

        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            disabled={isReview}
            style={({ pressed }) => [
              styles.option,
              {
                borderColor,
                backgroundColor,
                opacity: pressed && !isReview ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name={(iconName ?? indicatorIcon) as any}
              size={22}
              color={iconName ? (iconName.includes('close') ? colors.error : colors.success) : colors.text}
              style={styles.icon}
            />
            <Text style={[styles.label, isSelected && !isReview && styles.selectedLabel]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  icon: {
    marginRight: spacing.md,
  },
  label: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  selectedLabel: {
    fontWeight: typography.weights.bold,
  },
});

export default ChoiceOption;
