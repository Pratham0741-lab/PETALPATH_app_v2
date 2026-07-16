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

interface ErrorDialogProps {
  visible: boolean;
  title: string;
  message: string;
  retryLabel?: string;
  dismissLabel?: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  visible,
  title,
  message,
  retryLabel = 'Retry',
  dismissLabel = 'Dismiss',
  onRetry,
  onDismiss,
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
          accessibilityLabel={`Error: ${title}`}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={48} color={colors.error} />
          </View>
          <Text style={styles.title} accessibilityRole="text">{title}</Text>
          <Text style={styles.message} accessibilityRole="text">{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={dismissLabel}
            >
              <Text style={styles.dismissText}>{dismissLabel}</Text>
            </TouchableOpacity>
            {onRetry ? (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel={retryLabel}
                accessibilityHint="Attempts the action again"
              >
                <Text style={styles.retryText}>{retryLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  dismissButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dismissText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  retryButton: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  retryText: {
    color: colors.white,
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
});
