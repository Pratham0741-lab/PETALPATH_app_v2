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

interface PermissionDialogProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  allowLabel?: string;
  denyLabel?: string;
  onAllow: () => void;
  onDeny: () => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  visible,
  title,
  message,
  icon = 'shield-checkmark',
  allowLabel = 'Allow',
  denyLabel = 'Deny',
  onAllow,
  onDeny,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDeny}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onDeny} accessibilityLabel="Close dialog">
        <Pressable
          style={styles.dialog}
          onPress={() => {}}
          accessibilityRole="alert"
          accessibilityLabel={`Permission: ${title}`}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={48} color={colors.primary} />
          </View>
          <Text style={styles.title} accessibilityRole="text">{title}</Text>
          <Text style={styles.message} accessibilityRole="text">{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={onDeny}
              accessibilityRole="button"
              accessibilityLabel={denyLabel}
            >
              <Text style={styles.denyText}>{denyLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.allowButton}
              onPress={onAllow}
              accessibilityRole="button"
              accessibilityLabel={allowLabel}
            >
              <Text style={styles.allowText}>{allowLabel}</Text>
            </TouchableOpacity>
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
  denyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  denyText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  allowButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  allowText: {
    color: colors.white,
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
});
