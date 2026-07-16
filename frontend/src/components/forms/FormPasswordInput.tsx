import React, { useState, useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Control } from 'react-hook-form';
import { FormInput } from './FormInput';
import { colors } from '../../theme/colors';

interface FormPasswordInputProps {
  name: string;
  control: Control<any>;
  label?: string;
  placeholder?: string;
  rules?: object;
  disabled?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go';
}

export const FormPasswordInput: React.FC<FormPasswordInputProps> = ({
  name,
  control,
  label,
  placeholder = 'Enter password',
  rules,
  disabled = false,
  onSubmitEditing,
  returnKeyType,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const rightIcon = (
    <TouchableOpacity
      onPress={togglePassword}
      disabled={disabled}
      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
      accessibilityHint={showPassword ? 'Taps to hide the password' : 'Taps to reveal the password'}
      accessibilityRole="button"
    >
      <Ionicons
        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
        size={22}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <FormInput
      name={name}
      control={control}
      label={label}
      placeholder={placeholder}
      rules={rules}
      secureTextEntry={!showPassword}
      autoCapitalize="none"
      rightIcon={rightIcon}
      disabled={disabled}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
    />
  );
};
