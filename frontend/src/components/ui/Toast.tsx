/**
 * Toast — the transient top-of-screen notice.
 *
 * Redesign notes (§7, §29, §30, §31, §35): like `Modal` and `BottomSheet` this
 * ships through the `components/ui` barrel with no call sites today, so it was
 * carrying pre-redesign habits for whoever imports it next.
 *
 *  - The icons were the text characters `✓ ✕ ⚠ ℹ`. They are real glyphs now (§7).
 *  - The bigger problem was contrast. Every variant put white text on a mid-tone
 *    fill: white on `success` #8FC27A is 2.06:1, on `warning` #EE8C3C 2.49:1, on
 *    `error` #E2544C 3.75:1 and on `primary` #F43F72 3.62:1 — all below the
 *    4.5:1 minimum, the green badly so (§30). `FeedbackBanner` already solved
 *    this for the activity screens by pairing a soft tint with the matching dark
 *    ink, so this uses the same pairs and the two now look related (§35).
 *  - The shadow was an immediately-invoked arrow function returning a literal
 *    shadow object, where `shadows.lg` says the same thing (§29).
 *  - `SCREEN_WIDTH` was read once at module scope, so the `maxWidth` was frozen
 *    at whatever the window was when the bundle loaded and survived neither a
 *    rotation nor a foldable. The gutters do that job on their own, so the cap
 *    is gone entirely.
 *  - The slide-in ran unconditionally; it honours `useReducedMotion()` now (§31).
 *  - `zIndex: 9999` competed with the camera debug overlay for the top of the
 *    stack. A toast belongs above app chrome but not above a diagnostics panel,
 *    so it sits just below it.
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

/**
 * Soft fill + dark ink, matching `FeedbackBanner`. Each tone also carries a
 * distinct glyph so the meaning survives without colour (§30).
 */
const TOASTS: Record<ToastType, { bg: string; fg: string; border: string; icon: PetalIconName }> = {
  success: { bg: colors.greenSoft, fg: colors.successDark, border: colors.success, icon: 'check' },
  error: { bg: colors.errorLight, fg: colors.error, border: colors.error, icon: 'warning' },
  warning: { bg: colors.warningLight, fg: colors.warningDark, border: colors.warning, icon: 'info' },
  info: { bg: colors.blueSoft, fg: colors.blueDark, border: colors.blue, icon: 'info' },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  onHide,
  duration = 3000,
}) => {
  const reducedMotion = useReducedMotion();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(-100);
      return;
    }

    // Reduced motion still lands the toast on screen — it just skips the travel.
    if (reducedMotion) {
      slideAnim.setValue(0);
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    }

    const timer = setTimeout(() => {
      if (reducedMotion) {
        slideAnim.setValue(-100);
        onHide();
        return;
      }
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onHide());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onHide, slideAnim, reducedMotion]);

  if (!visible) return null;

  const t = TOASTS[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: t.bg,
          borderColor: t.border,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <PetalIcon name={t.icon} size={18} color={t.fg} filled />
      <Text style={[styles.message, { color: t.fg }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    /* Above app chrome, below the camera diagnostics panel. */
    zIndex: 900,
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  message: {
    ...typography.presets.subtle,
    /* Two lines of message text must wrap inside the row, not widen it (§27). */
    flexShrink: 1,
    flexGrow: 1,
  },
});

export default Toast;
