import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useController, Control } from 'react-hook-form';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

const OTP_LENGTH = 6;

interface FormOTPInputProps {
  name: string;
  control: Control<any>;
  label?: string;
  disabled?: boolean;
  onComplete?: (code: string) => void;
}

export const FormOTPInput: React.FC<FormOTPInputProps> = ({
  name,
  control,
  label,
  disabled = false,
  onComplete,
}) => {
  const hiddenInputRef = useRef<TextInput>(null);

  const {
    field: { onChange, value, ref },
    fieldState: { error },
  } = useController({ name, control });

  const otpValue = (value ?? '') as string;
  const otpDigits = otpValue.split('').slice(0, OTP_LENGTH);
  const filledCount = otpDigits.length;

  const handleHiddenChange = useCallback(
    (text: string) => {
      const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
      onChange(digits);
      if (digits.length === OTP_LENGTH) {
        onComplete?.(digits);
      }
    },
    [onChange, onComplete],
  );

  const focusInput = useCallback(() => {
    if (!disabled) {
      hiddenInputRef.current?.focus();
    }
  }, [disabled]);

  const hiddenRefCallback = useCallback(
    (instance: TextInput | null) => {
      (hiddenInputRef as React.MutableRefObject<TextInput | null>).current = instance;
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<TextInput | null>).current = instance;
      }
    },
    [ref],
  );

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label} accessibilityLabel={label}>
          {label}
        </Text>
      ) : null}

      <Pressable style={styles.otpRow} onPress={focusInput}>
        {Array.from({ length: OTP_LENGTH }).map((_, index) => {
          const digit = otpDigits[index] ?? '';
          const isActive = index === filledCount && filledCount < OTP_LENGTH;

          return (
            <View
              key={index}
              style={[
                styles.otpBox,
                isActive && styles.otpBoxActive,
                error ? styles.otpBoxError : undefined,
                disabled ? styles.otpBoxDisabled : undefined,
              ]}
            >
              <Text
                style={[
                  styles.otpDigit,
                  isActive && styles.otpDigitActive,
                ]}
              >
                {digit}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={hiddenRefCallback}
        style={styles.hiddenInput}
        value={otpValue}
        onChangeText={handleHiddenChange}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        editable={!disabled}
        accessibilityLabel={label ?? 'OTP input'}
        accessibilityHint={`Enter ${OTP_LENGTH} digit code`}
      />

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
    alignItems: 'center',
  },
  label: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontFamily: typography.families.rounded,
  },
  otpRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  otpBoxError: {
    borderColor: colors.error,
  },
  otpBoxDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceSecondary,
  },
  otpDigit: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  otpDigitActive: {
    color: colors.primary,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    ...Platform.select({
      web: { caretColor: 'transparent' },
    }),
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontFamily: typography.families.rounded,
  },
});
