import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';
import { useController, Control } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

export interface FormInputProps {
  name: string;
  control: Control<any>;
  label?: string;
  placeholder?: string;
  rules?: object;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go' | 'search';
}

export const FormInput: React.FC<FormInputProps> = ({
  name,
  control,
  label,
  placeholder,
  rules,
  leftIcon,
  rightIcon,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  disabled = false,
  onBlur: onBlurProp,
  onSubmitEditing,
  returnKeyType,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const {
    field: { onChange, onBlur, value, ref },
    fieldState: { error },
  } = useController({ name, control, rules });

  const handleBlur = () => {
    setIsFocused(false);
    onBlur();
    onBlurProp?.();
  };

  const inputStyles: TextInputProps['style'] = [
    styles.input,
    leftIcon ? styles.inputWithLeftIcon : undefined,
    (rightIcon || secureTextEntry) ? styles.inputWithRightIcon : undefined,
    multiline ? styles.multiline : undefined,
    isFocused ? styles.inputFocused : undefined,
    error ? styles.inputError : undefined,
    disabled ? styles.inputDisabled : undefined,
  ];

  return (
    <View style={styles.container}>
      {label ? (
        <Text
          style={[styles.label, disabled && styles.labelDisabled]}
          accessibilityLabel={label}
        >
          {label}
        </Text>
      ) : null}
      <View style={styles.inputWrapper}>
        {leftIcon ? (
          <View style={styles.leftIcon}>{leftIcon}</View>
        ) : null}
        <TextInput
          ref={ref}
          style={inputStyles}
          value={value ?? ''}
          onChangeText={onChange}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label ?? name}
          accessibilityHint={placeholder ?? `Enter ${name}`}
        />
        {rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>
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
  label: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: typography.families.rounded,
  },
  labelDisabled: {
    opacity: 0.5,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xxxl,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xxxl,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceSecondary,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontFamily: typography.families.rounded,
  },
});
