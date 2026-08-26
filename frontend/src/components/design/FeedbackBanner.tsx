import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * FeedbackBanner (spec §28, §30).
 *
 * "Correct! Splendid job!" / "Not quite, try again!" — every activity screen
 * showed this, each with its own pastel box and a trailing emoji standing in
 * for an icon. One component now owns it, and the icon means the message still
 * reads as praise or a nudge without relying on the green/red fill.
 */

export type FeedbackTone = 'correct' | 'incorrect' | 'info';

const TONES: Record<FeedbackTone, { bg: string; fg: string; icon: PetalIconName }> = {
  correct: { bg: colors.greenSoft, fg: colors.successDark, icon: 'check' },
  incorrect: { bg: colors.warningLight, fg: colors.warningDark, icon: 'replay' },
  info: { bg: colors.blueSoft, fg: colors.blueDark, icon: 'info' },
};

export interface FeedbackBannerProps {
  tone: FeedbackTone;
  message: string;
  style?: StyleProp<ViewStyle>;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({ tone, message, style }) => {
  const t = TONES[tone];

  return (
    <View
      style={[styles.banner, { backgroundColor: t.bg }, style]}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <PetalIcon name={t.icon} size={18} color={t.fg} filled />
      <Text style={[typography.presets.subtle, styles.text, { color: t.fg }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  text: {
    flexShrink: 1,
    textAlign: 'center',
  },
});

export default FeedbackBanner;
