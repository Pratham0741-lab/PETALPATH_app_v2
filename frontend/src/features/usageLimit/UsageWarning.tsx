/** The gentle "two more minutes" heads-up. Non-blocking: taps pass through except on the banner. */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MascotGuide } from '../baseline/components';
import { colors, radius, spacing, typography } from '../../theme';

export const UsageWarning: React.FC<{ characterType?: string | null; onDismiss: () => void }> = ({ characterType, onDismiss }) => (
  <View style={styles.wrap} pointerEvents="box-none">
    <Pressable onPress={onDismiss} style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <MascotGuide characterType={characterType} size={56} />
      <Text style={[typography.presets.cardTitle, styles.text]}>Two more minutes!</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9000,
    elevation: 9000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.yellowSoft,
    borderRadius: radius.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: { color: colors.text },
});
