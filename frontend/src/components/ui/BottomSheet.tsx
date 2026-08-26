/**
 * BottomSheet — the shared bottom-anchored panel.
 *
 * Redesign notes (§7, §29, §30, §31): the third of the barrel-exported dialogs
 * with no call sites today, carrying the same habits as `Modal` and `Toast`.
 *
 *  - The close affordance was the text character `✕`. It is a real `close` glyph
 *    in an `IconButton` now, which brings button semantics and a guaranteed
 *    minimum tap area with it (§7, §30).
 *  - `SCREEN_HEIGHT` was read once at module scope, so both the slide distance
 *    *and the sheet's own height* were frozen at whatever the window was when
 *    the bundle loaded. On a rotation the sheet kept its portrait height. Both
 *    come from `useWindowDimensions()` now.
 *  - The enter/exit animation ran unconditionally; it honours
 *    `useReducedMotion()` now (§31).
 *  - The shadow was an immediately-invoked arrow function returning a literal
 *    object (§29). It uses `shadows.xl` with the offset flipped upward, since a
 *    sheet rising from the bottom edge casts its shadow up rather than down.
 *  - The backdrop had an `accessibilityLabel` but no role, so a screen reader
 *    announced it as plain text rather than something you can activate.
 *  - `Platform` was imported and never used.
 *  - `if (!visible) return null` sat above the exit animation, so the component
 *    unmounted on the same render that started it and the sheet vanished
 *    instantly. It stays mounted until the animation finishes now, which is the
 *    whole reason the exit timing exists.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../theme';
import { IconButton } from '../design';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Share of the screen height the sheet occupies, 25-90. Default 50. */
  snapPoints?: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  snapPoints = 50,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideOffset = useRef(new Animated.Value(windowHeight)).current;

  // Kept mounted across the exit animation; `visible` alone would unmount first.
  const [rendered, setRendered] = useState(visible);

  const clampedSnap = Math.max(25, Math.min(90, snapPoints));
  const sheetHeight = (windowHeight * clampedSnap) / 100;

  useEffect(() => {
    if (visible) {
      setRendered(true);
    }

    const fade = reducedMotion ? 0 : visible ? 250 : 200;
    const slide = reducedMotion ? 0 : visible ? 300 : 250;

    const animation = Animated.parallel([
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
    ]);

    animation.start(({ finished }) => {
      // Only tear down once the sheet has actually travelled off screen.
      if (finished && !visible) {
        setRendered(false);
      }
    });

    return () => animation.stop();
  }, [visible, reducedMotion, windowHeight, overlayOpacity, slideOffset]);

  if (!rendered) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.overlayBg, { opacity: overlayOpacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          accessibilityHint="Dismisses this panel"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            transform: [{ translateY: slideOffset }],
          },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        {title && (
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
              {title}
            </Text>
            <IconButton
              icon="close"
              onPress={onClose}
              size="sm"
              variant="soft"
              tone="neutral"
              accessibilityLabel="Close"
            />
          </View>
        )}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  overlayBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadows.xl,
    /* A sheet sitting on the bottom edge casts its shadow upward. */
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.presets.section,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
});

export default BottomSheet;
