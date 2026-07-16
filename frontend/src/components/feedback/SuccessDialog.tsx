import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../../theme';

interface SuccessDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  onDismiss: () => void;
  buttonLabel?: string;
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  visible,
  title,
  message,
  onDismiss,
  buttonLabel = 'Great!',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onDismiss} accessibilityLabel="Close dialog">
        <Pressable
          style={styles.dialog}
          onPress={() => {}}
          accessibilityRole="alert"
          accessibilityLabel={`Success: ${title}`}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          </View>
          <Text style={styles.title} accessibilityRole="text">{title}</Text>
          {message ? (
            <Text style={styles.message} accessibilityRole="text">{message}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.button}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    lineHeight: typography.lineHeights.sm,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
});
