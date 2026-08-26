import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  mediaOrbSizes,
  progressSizes,
  MediaOrbSizeToken,
} from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * MediaOrb (spec §28).
 *
 * The one big round control at the centre of Watch, Listen and Speak — a play
 * button, a speaker, a microphone. All three screens had their own version of
 * this (two concentric translucent rings, an icon, a caption, a thin progress
 * bar), which is precisely the per-page drift §35 forbids.
 *
 * It is a real `Pressable` with an accessible label, not a decorative circle
 * with a tap handler bolted on, and the idle pulse is skipped when the OS asks
 * for reduced motion (§30).
 */

export interface MediaOrbProps {
  icon: PetalIconName;
  /** Caption under the orb, e.g. "Tap to Listen". */
  label: string;
  /** Activity identity colour (§15). */
  color: string;
  /** The soft tint that pairs with `color`. */
  soft: string;
  /** Inverts the orb and starts the pulse — playing, recording, speaking. */
  active?: boolean;
  onPress?: () => void;
  /** Playback position, 0-100. Omit to hide the bar. */
  progress?: number;
  size?: MediaOrbSizeToken;
  /** Small warning line under the caption, e.g. "Audio coming soon". */
  note?: string;
  /** Corner slot — used for the mentor avatar peeking over the card. */
  corner?: React.ReactNode;
  disabled?: boolean;
  /** Defaults to the visible label. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Skip the idle pulse. Pass the reduced-motion flag through. */
  reduceMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const MediaOrb: React.FC<MediaOrbProps> = ({
  icon,
  label,
  color,
  soft,
  active = false,
  onPress,
  progress,
  size = 'lg',
  note,
  corner,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  reduceMotion = false,
  style,
  testID,
}) => {
  const inert = disabled || !onPress;
  const s = mediaOrbSizes[size];

  const press = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // A slow breath while active, so a child can see the sound is still playing.
  useEffect(() => {
    if (!active || reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, pulse]);

  const to = (v: number) => {
    if (inert) return;
    Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const pct =
    typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      onPressIn={() => to(0.98)}
      onPressOut={() => to(1)}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: active }}
      testID={testID}
      style={[
        styles.card,
        shadows.md,
        { borderColor: active ? color : colors.border, backgroundColor: active ? soft : colors.surface },
        style,
      ]}
    >
      {corner ? <View style={styles.corner}>{corner}</View> : null}

      <Animated.View
        style={[
          styles.outer,
          {
            width: s.outer,
            height: s.outer,
            borderRadius: s.outer / 2,
            backgroundColor: soft,
            transform: [{ scale: Animated.multiply(press, pulseScale) }],
          },
        ]}
      >
        <View
          style={[
            styles.inner,
            {
              width: s.inner,
              height: s.inner,
              borderRadius: s.inner / 2,
              backgroundColor: active ? color : colors.surface,
              borderColor: color,
            },
          ]}
        >
          <PetalIcon
            name={icon}
            size={s.icon}
            color={active ? colors.white : color}
            filled={active}
          />
        </View>
      </Animated.View>

      <Text style={[typography.presets.cardTitle, styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>

      {note ? (
        <Text style={[typography.presets.caption, styles.note]} numberOfLines={2}>
          {note}
        </Text>
      ) : null}

      {typeof pct === 'number' ? (
        <View style={styles.track} accessible={false}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.illustrationCard,
    borderWidth: 2,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: {
    marginTop: spacing.md,
  },
  note: {
    color: colors.warning,
    marginTop: 2,
    textAlign: 'center',
  },
  track: {
    width: '78%',
    height: progressSizes.barHeightThin,
    borderRadius: radius.progress,
    backgroundColor: colors.skeleton,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.progress,
  },
});

export default MediaOrb;
