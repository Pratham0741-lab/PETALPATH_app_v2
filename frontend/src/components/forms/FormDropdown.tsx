import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useController, Control } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

interface DropdownOption {
  label: string;
  value: string;
}

interface FormDropdownProps {
  name: string;
  control: Control<any>;
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  disabled?: boolean;
}

export const FormDropdown: React.FC<FormDropdownProps> = ({
  name,
  control,
  label,
  placeholder = 'Select an option',
  options,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name, control });

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label ?? placeholder;

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange],
  );

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

      <TouchableOpacity
        style={[
          styles.trigger,
          error ? styles.triggerError : undefined,
          disabled ? styles.triggerDisabled : undefined,
        ]}
        onPress={() => setIsOpen(true)}
        disabled={disabled}
        accessibilityLabel={label ?? name}
        accessibilityHint={`Selected: ${displayText}. Tap to change.`}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption ? styles.triggerPlaceholder : undefined,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {error ? (
        <Text
          style={styles.errorText}
          accessibilityLabel={error.message}
          accessibilityRole="alert"
        >
          {error.message}
        </Text>
      ) : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setIsOpen(false)}
        >
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label ?? 'Select'}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value ? styles.optionItemSelected : undefined,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value ? styles.optionTextSelected : undefined,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  triggerError: {
    borderColor: colors.error,
  },
  triggerDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceSecondary,
  },
  triggerText: {
    fontSize: typography.sizes.body,
    color: colors.text,
    flex: 1,
    fontFamily: typography.families.rounded,
  },
  triggerPlaceholder: {
    color: colors.textMuted,
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontFamily: typography.families.rounded,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    fontFamily: typography.families.rounded,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  optionItemSelected: {
    backgroundColor: colors.backgroundSecondary,
  },
  optionText: {
    fontSize: typography.sizes.body,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  optionTextSelected: {
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
});
