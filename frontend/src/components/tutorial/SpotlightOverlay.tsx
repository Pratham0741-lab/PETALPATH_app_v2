/**
 * SpotlightOverlay
 *
 * Full-screen dark overlay with a transparent rectangular cutout.
 * Used during tutorials to focus attention on a target element.
 */

import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View, Dimensions } from 'react-native';
import { useTutorialStore } from '../../store/tutorialStore';

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightOverlayProps {
  visible: boolean;
  targetRect?: TargetRect;
  onDismiss?: () => void;
  overlayOpacity?: number;
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
  visible,
  targetRect,
  onDismiss,
  overlayOpacity = 0.6,
}) => {
  const { animationsEnabled } = useTutorialStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && animationsEnabled) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animationsEnabled]);

  if (!visible || !animationsEnabled) return null;

  const { width: screenW, height: screenH } = Dimensions.get('window');

  // If no target, just show full overlay
  if (!targetRect) {
    return (
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View
          style={[styles.overlay, { opacity: Animated.multiply(fadeAnim, overlayOpacity) }]}
        />
      </TouchableWithoutFeedback>
    );
  }

  const { x, y, width, height } = targetRect;
  const pad = 8; // padding around cutout

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Top strip */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={[styles.strip, { top: 0, left: 0, right: 0, height: Math.max(0, y - pad), opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>
      {/* Bottom strip */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View
          style={[
            styles.strip,
            {
              top: y + height + pad,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: overlayOpacity,
            },
          ]}
        />
      </TouchableWithoutFeedback>
      {/* Left strip */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View
          style={[
            styles.strip,
            {
              top: Math.max(0, y - pad),
              left: 0,
              width: Math.max(0, x - pad),
              height: height + pad * 2,
              opacity: overlayOpacity,
            },
          ]}
        />
      </TouchableWithoutFeedback>
      {/* Right strip */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View
          style={[
            styles.strip,
            {
              top: Math.max(0, y - pad),
              left: x + width + pad,
              right: 0,
              height: height + pad * 2,
              opacity: overlayOpacity,
            },
          ]}
        />
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 150,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  strip: {
    position: 'absolute',
    backgroundColor: '#000',
  },
});
