/**
 * Shared Accessibility Overlay — PetalPath Core UI
 * Renders accessibility controls & screen reader instructions for activities.
 *
 * Redesign notes (spec §7, §28): the two hand-rolled `TouchableOpacity` +
 * Ionicons controls are now `IconButton`s from the design system, so they match
 * every other floating control in the app and inherit its touch target and
 * pressed state. The container keeps its screen-reader header role — on the
 * drag & drop board neither callback is supplied, and the overlay's only job
 * there is to announce the activity instruction.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { IconButton } from '../../components/design';
import { AccessibilityService } from '../accessibility/accessibilityService';

export interface AccessibilityOverlayProps {
  instruction?: string;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  onReadInstruction?: () => void;
}

export const AccessibilityOverlay: React.FC<AccessibilityOverlayProps> = ({
  instruction,
  highContrast,
  onToggleHighContrast,
  onReadInstruction,
}) => {
  const displayInstruction = AccessibilityService.getScreenReaderLabel(
    instruction,
    'Follow instructions to complete activity'
  );

  return (
    <View
      style={styles.container}
      accessibilityRole="header"
      accessibilityLabel={`Activity Instruction: ${displayInstruction}`}
    >
      {onReadInstruction && (
        <IconButton
          icon="sound"
          variant="surface"
          tone="brand"
          size="sm"
          onPress={onReadInstruction}
          accessibilityLabel="Read instruction aloud"
        />
      )}

      {onToggleHighContrast && (
        <IconButton
          icon="settings"
          variant={highContrast ? 'solid' : 'surface'}
          tone="purple"
          size="sm"
          onPress={onToggleHighContrast}
          accessibilityLabel="Toggle high contrast mode"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    zIndex: 100,
  },
});
