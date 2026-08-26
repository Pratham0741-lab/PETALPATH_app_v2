/**
 * FormInput — the react-hook-form text field used by the auth screens and by
 * "Add / edit child" in the profile tab.
 *
 * Redesign notes (§7, §29, §30):
 *
 *  - `Ionicons` and `TouchableOpacity` were imported and never used. Both are
 *    gone; the icon slots are `leftIcon`/`rightIcon` render props, so the caller
 *    supplies a `PetalIcon`.
 *  - Focus used to raise the border from 1px to 2px, which reflows the field and
 *    nudges the text by a pixel every time it is tapped. The border is 2px in
 *    both states now and only the colour changes.
 *  - The disabled state faded the whole field to `opacity: 0.5`, dragging the
 *    value the parent had already typed below 4.5:1. A disabled field keeps its
 *    text at full strength and shows its state through the muted surface and
 *    border instead.
 *  - The field is at least `MIN_TOUCH_TARGET` tall, and the label and error text
 *    come from the typography presets rather than ad-hoc size/weight pairs.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useController, Control } from 'react-hook-form';

import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../../theme';

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
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
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
        <Text style={styles.errorText} accessibilityRole="alert">
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
    ...typography.presets.subtle,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
  },
  labelDisabled: {
    color: colors.textMuted,
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
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surface,
    // The width stays at 2 in every state — see the note at the top of the file.
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
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
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.skeleton,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    ...typography.presets.caption,
    color: colors.error,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xs,
  },
});
