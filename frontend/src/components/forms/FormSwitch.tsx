import React, { useCallback } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useController, Control } from 'react-hook-form';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface FormSwitchProps {
  name: string;
  control: Control<any>;
  label: string;
  disabled?: boolean;
}

export const FormSwitch: React.FC<FormSwitchProps> = ({
  name,
  control,
  label,
  disabled = false,
}) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name, control });

  const isOn = Boolean(value);

  const handleChange = useCallback(
    (newValue: boolean) => {
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text
          style={[
            styles.label,
            disabled ? styles.labelDisabled : undefined,
          ]}
        >
          {label}
        </Text>
        <Switch
          value={isOn}
          onValueChange={handleChange}
          disabled={disabled}
          trackColor={{
            false: colors.border,
            true: colors.primaryLight,
          }}
          thumbColor={isOn ? colors.primary : colors.surface}
          accessibilityLabel={label}
          accessibilityHint={isOn ? 'On' : 'Off'}
          accessibilityRole="switch"
          accessibilityState={{ checked: isOn, disabled }}
        />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: typography.sizes.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
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
