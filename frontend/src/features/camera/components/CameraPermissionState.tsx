import React from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraStatus } from '../types/camera.types';
import { colors, spacing, typography, radius } from '../../../theme';

interface CameraPermissionStateProps {
  status: CameraStatus;
  onRequestPermission: () => void;
}

export const CameraPermissionState: React.FC<CameraPermissionStateProps> = ({
  status,
  onRequestPermission,
}) => {
  if (status === 'permission_denied') {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          PetalPath requires camera access to preview activities. Please enable camera permissions in your device settings.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => Linking.openSettings()}
        >
          <Ionicons name="settings-outline" size={20} color={colors.card} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Open Device Settings</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.coral} />
        <Text style={styles.title}>Camera Unavailable</Text>
        <Text style={styles.subtitle}>
          No compatible rear camera device was found on this device or the camera is currently in use.
        </Text>
      </View>
    );
  }

  if (status === 'requesting_permission') {
    return (
      <View style={styles.container}>
        <Ionicons name="camera" size={64} color={colors.purple} />
        <Text style={styles.title}>Camera Permission</Text>
        <Text style={styles.subtitle}>
          Tap below to grant camera access for real-time live preview.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onRequestPermission}
        >
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="reload-outline" size={48} color={colors.purple} />
      <Text style={styles.title}>Initializing Camera...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xl,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  buttonText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: colors.card,
    fontWeight: '600',
  },
});
