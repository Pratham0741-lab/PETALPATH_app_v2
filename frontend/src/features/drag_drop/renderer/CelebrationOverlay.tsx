/**
 * Celebration Overlay View — PetalPath Drag & Drop Presentation
 * Renders particle confetti and sparkle effects on correct drop or activity completion.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ConfettiEffect } from '../../../components/activities/ConfettiEffect';

export interface CelebrationOverlayProps {
  showConfetti: boolean;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ showConfetti }) => {
  if (!showConfetti) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ConfettiEffect visible={showConfetti} />
    </View>
  );
};
