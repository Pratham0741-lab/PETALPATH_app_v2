import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useController, Control } from 'react-hook-form';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

interface RadioOption {
  label: string;
  value: string;
}

interface FormRadioProps {
  name: string;
  control: Control<any>;
  label?: string;
  options: RadioOption[];
  disabled?: boolean;
}

export const FormRadio: React.FC<FormRadioProps> = ({
  name,
  control,
  label,
  options,
  disabled = false,
}) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name, control });

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (!disabled) {
        onChange(optionValue);
      }
    },
    [disabled, onChange],
  );

  return (
    <View style={styles.container}>
      {label ? (
        <Text
          style={[styles.groupLabel, disabled && styles.labelDisabled]}
          accessibilityLabel={label}
        >
          {label}
        </Text>
      ) : null}
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={styles.row}
            onPress={() => handleSelect(option.value)}
            disabled={disabled}
            accessibilityLabel={option.label}
            accessibilityHint={isSelected ? 'Selected' : 'Not selected'}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
          >
            <View
              style={[
                styles.radio,
                isSelected ? styles.radioSelected : undefined,
                disabled ? styles.radioDisabled : undefined,
              ]}
            >
              {isSelected ? <View style={styles.radioDot} /> : null}
            </View>
            <Text
              style={[
                styles.optionLabel,
                disabled && styles.labelDisabled,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
      {error ? (
        <Text
          style={styles.errorText}
          accessibilityLabel={error.message}
          accessibilityRole="alert"
        >
          {error.message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  groupLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: typography.families.rounded,
  },
  labelDisabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDisabled: {
    opacity: 0.5,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    fontSize: typography.sizes.body,
    color: colors.text,
    flex: 1,
    fontFamily: typography.families.rounded,
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontFamily: typography.families.rounded,
  },
});
