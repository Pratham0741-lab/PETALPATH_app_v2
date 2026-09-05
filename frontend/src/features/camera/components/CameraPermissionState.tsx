/**
 * What the child sees instead of the camera (spec §34 phase 7).
 *
 * Both camera screens render this in place of the preview, so it is the first
 * thing anyone meets when permission is missing — and it was the least designed
 * surface in the app: four hand-rolled `Text` blocks with per-instance
 * `typography.families.rounded` + `sizes.*`, two `Pressable`s pretending to be
 * buttons, and Ionicons throughout (§7).
 *
 * It is now one layout driven by the status, built from the shared `IconWell`,
 * `typography.presets` and real `PrimaryButton`/`SecondaryButton`s. The four
 * `CameraStatus` branches, their exact wording, `Linking.openSettings()` and
 * `onRequestPermission` are all unchanged (§1).
 *
 * Two judgments:
 *
 *  - The initialising state showed a *static* `reload-outline`, which looks like
 *    a retry button you can press. An `ActivityIndicator` says the same thing
 *    honestly, and is announced as busy rather than sitting silent.
 *  - `container` keeps its `flex: 1` on purpose: this fills the black preview
 *    box, and is not inside a scroll view.
 */

import React from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { CameraStatus } from '../types/camera.types';
import { IconWell, PrimaryButton, SecondaryButton } from '../../../components/design';
import { cardSizes, colors, spacing, typography, layoutSizes } from '../../../theme';
import { PetalMark } from '../../../components/brand/PetalMark';

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
      <Frame
        icon="camera"
        color={colors.textSecondary}
        soft={colors.surfaceSecondary}
        title="Camera Access Needed"
        message="PetalPath requires camera access to preview activities. Please enable camera permissions in your device settings."
      >
        <SecondaryButton
          label="Open Device Settings"
          icon="settings"
          onPress={() => Linking.openSettings()}
          accessibilityHint="Opens the system settings app so you can turn the camera on"
          style={styles.action}
        />
      </Frame>
    );
  }

  if (status === 'unavailable') {
    return (
      <Frame
        icon="warning"
        color={colors.error}
        soft={colors.errorLight}
        title="Camera Unavailable"
        message="No compatible rear camera device was found on this device or the camera is currently in use."
      />
    );
  }

  if (status === 'requesting_permission') {
    return (
      <Frame
        icon="camera"
        color={colors.primary}
        soft={colors.primaryLight}
        title="Camera Permission"
        message="Tap below to grant camera access for real-time live preview."
      >
        <PrimaryButton
          label="Grant Camera Permission"
          icon="camera"
          onPress={onRequestPermission}
          style={styles.action}
        />
      </Frame>
    );
  }

  return (
    <View style={styles.container}>
      <PetalMark size={96} loading />
      <Text style={[typography.presets.cardTitle, styles.title]} accessibilityRole="header">
        Initializing Camera…
      </Text>
    </View>
  );
};

/** One shape for all three explained states, so none of them drifts. */
const Frame: React.FC<{
  icon: 'camera' | 'warning';
  color: string;
  soft: string;
  title: string;
  message: string;
  children?: React.ReactNode;
}> = ({ icon, color, soft, title, message, children }) => (
  <View style={styles.container}>
    <IconWell icon={icon} color={color} soft={soft} size={cardSizes.iconWellLarge} filled />
    <Text style={[typography.presets.section, styles.title]} accessibilityRole="header">
      {title}
    </Text>
    <Text style={[typography.presets.body, styles.message]}>{message}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    /* Fills the preview box it replaces — not inside a scroll view, so `flex`
       is correct here. */
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: layoutSizes.reading,
  },
  action: {
    marginTop: spacing.sm,
    width: '100%',
    maxWidth: 320,
  },
});

export default CameraPermissionState;
