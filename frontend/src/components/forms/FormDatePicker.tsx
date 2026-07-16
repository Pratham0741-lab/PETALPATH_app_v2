import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useController, Control } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

interface FormDatePickerProps {
  name: string;
  control: Control<any>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseDate(value: string | undefined | null): { year: number; month: number; day: number } {
  if (!value) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
  const parts = value.split('-');
  return {
    year: parseInt(parts[0], 10) || new Date().getFullYear(),
    month: parseInt(parts[1], 10) || 1,
    day: parseInt(parts[2], 10) || 1,
  };
}

export const FormDatePicker: React.FC<FormDatePickerProps> = ({
  name,
  control,
  label,
  placeholder = 'Select date',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({ name, control });

  const currentDate = useMemo(() => parseDate(value), [value]);
  const [tempYear, setTempYear] = useState(currentDate.year);
  const [tempMonth, setTempMonth] = useState(currentDate.month);
  const [tempDay, setTempDay] = useState(currentDate.day);

  const daysInMonth = getDaysInMonth(tempYear, tempMonth);

  const openModal = useCallback(() => {
    if (!disabled) {
      const parsed = parseDate(value);
      setTempYear(parsed.year);
      setTempMonth(parsed.month);
      setTempDay(parsed.day);
      setIsOpen(true);
    }
  }, [disabled, value]);

  const handleConfirm = useCallback(() => {
    const safeDay = Math.min(tempDay, daysInMonth);
    const formatted = formatDate(tempYear, tempMonth, safeDay);
    onChange(formatted);
    setIsOpen(false);
  }, [tempYear, tempMonth, tempDay, daysInMonth, onChange]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const displayText = value
    ? MONTHS[currentDate.month - 1] + ' ' + currentDate.day + ', ' + currentDate.year
    : placeholder;

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
        onPress={openModal}
        disabled={disabled}
        accessibilityLabel={label ?? name}
        accessibilityHint={`Selected: ${displayText}. Tap to change.`}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !value ? styles.triggerPlaceholder : undefined,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons
          name="calendar-outline"
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
        onRequestClose={handleCancel}
      >
        <Pressable style={styles.overlay} onPress={handleCancel}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label ?? 'Select Date'}</Text>

            <View style={styles.pickerRow}>
              <PickerColumn
                label="Year"
                value={tempYear}
                min={new Date().getFullYear() - 100}
                max={new Date().getFullYear() + 10}
                onChange={setTempYear}
                formatValue={(v) => String(v)}
              />
              <PickerColumn
                label="Month"
                value={tempMonth}
                min={1}
                max={12}
                onChange={setTempMonth}
                formatValue={(v) => MONTHS[v - 1]}
              />
              <PickerColumn
                label="Day"
                value={Math.min(tempDay, daysInMonth)}
                min={1}
                max={daysInMonth}
                onChange={setTempDay}
                formatValue={(v) => String(v)}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                accessibilityLabel="Confirm"
                accessibilityRole="button"
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

interface PickerColumnProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
}

const PickerColumn: React.FC<PickerColumnProps> = ({
  label,
  value,
  min,
  max,
  onChange,
  formatValue,
}) => {
  const increment = useCallback(() => {
    onChange(Math.min(value + 1, max));
  }, [value, max, onChange]);

  const decrement = useCallback(() => {
    onChange(Math.max(value - 1, min));
  }, [value, min, onChange]);

  return (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity
        onPress={increment}
        style={styles.arrowButton}
        accessibilityLabel={`Increase ${label}`}
        accessibilityRole="button"
      >
        <Ionicons name="chevron-up" size={24} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.pickerValue}>{formatValue(value)}</Text>
      <TouchableOpacity
        onPress={decrement}
        style={styles.arrowButton}
        accessibilityLabel={`Decrease ${label}`}
        accessibilityRole="button"
      >
        <Ionicons name="chevron-down" size={24} color={colors.primary} />
      </TouchableOpacity>
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
  },
  modalTitle: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    fontFamily: typography.families.rounded,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: typography.families.rounded,
    textTransform: 'uppercase',
  },
  arrowButton: {
    padding: spacing.xs,
  },
  pickerValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    paddingVertical: spacing.sm,
    fontFamily: typography.families.rounded,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  confirmButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
  },
  confirmText: {
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
    fontFamily: typography.families.rounded,
  },
});
