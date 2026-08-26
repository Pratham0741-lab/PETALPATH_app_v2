/**
 * FormPasswordInput — a `FormInput` with a reveal/hide toggle.
 *
 * Redesign notes (§7, §30): the Ionicons `eye-outline` / `eye-off-outline` pair
 * becomes the `eye` / `eyeOff` PetalIcons, added to the icon set for this, so the
 * auth forms no longer pull in a second icon library for one glyph.
 *
 * The toggle is an `IconButton` rather than a bare `TouchableOpacity` wrapping a
 * 22px icon: that gave a roughly 22×22 tap target for a control a parent has to
 * hit while typing a password, well under the 48px minimum.
 */

import React, { useState, useCallback } from 'react';
import { Control } from 'react-hook-form';

import { FormInput } from './FormInput';
import { IconButton } from '../design';

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
    <IconButton
      icon={showPassword ? 'eyeOff' : 'eye'}
      onPress={togglePassword}
      size="sm"
      variant="plain"
      tone="neutral"
      disabled={disabled}
      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
      accessibilityHint={
        showPassword ? 'Hides the password again' : 'Shows the password as plain text'
      }
    />
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
