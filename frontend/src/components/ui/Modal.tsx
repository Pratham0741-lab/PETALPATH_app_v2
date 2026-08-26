/**
 * Modal — the shared centred dialog.
 *
 * Redesign notes (§7, §27, §29, §30, §31): like `StatCard`, this ships through
 * the `components/ui` barrel but has no call sites today, so it was quietly
 * carrying pre-redesign habits that whoever imports it next would inherit.
 *
 *  - The close affordance was the text character `✕` at `fontSize: 14` in a 32px
 *    circle. It is a real `close` glyph in an `IconButton` now, which brings the
 *    button semantics and the guaranteed minimum tap area with it (§7, §30).
 *  - The card shadow was an immediately-invoked arrow function returning a
 *    literal shadow object — five hardcoded values where `shadows.xl` already
 *    says exactly the same thing (§29).
 *  - `width: '90%'` with no cap meant a 920px-wide dialog on a tablet. It is
 *    capped like every other centred surface in the app (§27).
 *  - The enter/exit animation ran unconditionally; it honours
 *    `useReducedMotion()` now, cross-fading instantly instead (§30, §31).
 *  - The backdrop had an `accessibilityLabel` but no role, so a screen reader
 *    announced it as plain text rather than something you can activate.
 *  - `SCREEN_HEIGHT` was read once at module scope, so the slide-in distance was
 *    frozen at whatever the window was when the bundle loaded. It comes from
 *    `useWindowDimensions()` now and survives a rotation.
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { colors, radius, shadows, spacing, typography, layoutSizes } from '../../theme';
import { IconButton } from '../design';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type ModalAnimationType = 'slide' | 'fade';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  animationType?: ModalAnimationType;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  animationType = 'fade',
  showCloseButton = true,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideOffset = useRef(new Animated.Value(windowHeight)).current;

  useEffect(() => {
    // Reduced motion still needs the opacity to land on 0/1 and the sheet to
    // land on/off screen — it just gets there without the travel.
    const fade = reducedMotion ? 0 : visible ? 250 : 200;
    const slide = reducedMotion ? 0 : visible ? 300 : 250;

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: visible ? 1 : 0,
        duration: fade,
        useNativeDriver: true,
      }),
      Animated.timing(slideOffset, {
        toValue: visible ? 0 : windowHeight,
        duration: slide,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, reducedMotion, windowHeight, overlayOpacity, slideOffset]);

  const isSlide = animationType === 'slide';

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.overlayBg, { opacity: overlayOpacity }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            accessibilityHint="Dismisses this dialog"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            isSlide ? { transform: [{ translateY: slideOffset }] } : { opacity: overlayOpacity },
          ]}
        >
          {title || showCloseButton ? (
            <View style={styles.header}>
              {title ? (
                <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
                  {title}
                </Text>
              ) : (
                <View style={styles.titleSpacer} />
              )}
              {showCloseButton ? (
                <IconButton
                  icon="close"
                  onPress={onClose}
                  size="sm"
                  variant="soft"
                  tone="neutral"
                  accessibilityLabel="Close"
                />
              ) : null}
            </View>
          ) : null}

          <View style={styles.content}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '90%',
    /* A dialog should not stretch to the full width of a tablet (§27). */
    maxWidth: layoutSizes.dialog,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.presets.section,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  /* Keeps a lone close button on the right where the eye expects it. */
  titleSpacer: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
});

export default Modal;
