/**
 * Shared Accessibility Overlay — PetalPath Core UI
 * Renders accessibility controls & screen reader instructions for activities.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <TouchableOpacity
          onPress={onReadInstruction}
          style={styles.btn}
          accessibilityLabel="Read instruction aloud"
        >
          <Ionicons name="volume-high-outline" size={22} color="#4B5563" />
        </TouchableOpacity>
      )}

      {onToggleHighContrast && (
        <TouchableOpacity
          onPress={onToggleHighContrast}
          style={[styles.btn, highContrast && styles.btnActive]}
          accessibilityLabel="Toggle high contrast mode"
        >
          <Ionicons
            name="contrast-outline"
            size={22}
            color={highContrast ? '#8B5CF6' : '#4B5563'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnActive: {
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
});
