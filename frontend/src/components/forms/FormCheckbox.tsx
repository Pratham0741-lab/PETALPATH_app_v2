import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useController, Control } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

interface FormCheckboxProps {
  name: string;
  control: Control<any>;
  label: string;
  disabled?: boolean;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  name,
  control,
  label,
  disabled = false,
}) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name, control });

  const isChecked = Boolean(value);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      onChange(!isChecked);
    }
  }, [disabled, isChecked, onChange]);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.row}
        onPress={handleToggle}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={isChecked ? 'Checked' : 'Unchecked'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked, disabled }}
      >
        <View
          style={[
            styles.checkbox,
            isChecked ? styles.checkboxChecked : undefined,
            disabled ? styles.checkboxDisabled : undefined,
            error ? styles.checkboxError : undefined,
          ]}
        >
          {isChecked ? (
            <Ionicons
              name="checkmark"
              size={16}
              color={colors.white}
            />
          ) : null}
        </View>
        <Text
          style={[
            styles.label,
            disabled ? styles.labelDisabled : undefined,
          ]}
        >
          {label}
        </Text>
      </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkboxError: {
    borderColor: colors.error,
  },
  label: {
    fontSize: typography.sizes.body,
    color: colors.text,
    flex: 1,
    fontFamily: typography.families.rounded,
  },
  labelDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontFamily: typography.families.rounded,
  },
});
