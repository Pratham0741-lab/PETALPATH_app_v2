/**
 * The calm end-of-day screen. Covers the app; the child cannot dismiss it
 * (Android back is swallowed too). "Parent options" opens the addition gate,
 * then the parent options sheet.
 */
import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { GrownUpGate } from '../../components/design';
import { MascotGuide } from '../baseline/components';
import type { Child } from '../../types/child';
import { colors, spacing, typography } from '../../theme';
import { UsageSettingsSheet } from './UsageSettingsSheet';

const untilText = (ms: number) => {
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} minute${m === 1 ? '' : 's'}`;
  return m === 0 ? `${h} hour${h === 1 ? '' : 's'}` : `${h} hour${h === 1 ? '' : 's'} ${m} minute${m === 1 ? '' : 's'}`;
};

export const UsageLockScreen: React.FC<{ child: Child; resetsInMs: number }> = ({ child, resetsInMs }) => {
  const [gate, setGate] = useState(false);
  const [options, setOptions] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.fill} accessibilityViewIsModal>
      <View style={styles.body}>
        <MascotGuide characterType={child.mentor?.characterType} size={180} />
        <Text style={[typography.presets.title, styles.title]} accessibilityRole="header">
          Great learning today!
        </Text>
        <Text style={[typography.presets.cardTitle, styles.line]}>See you tomorrow.</Text>
        <Text style={[typography.presets.body, styles.reset]}>Back again in {untilText(resetsInMs)}</Text>
      </View>

      <Pressable onPress={() => setGate(true)} accessibilityRole="button" accessibilityLabel="Parent options" hitSlop={12} style={styles.parentLink}>
        <Text style={[typography.presets.caption, styles.parentText]}>Parent options</Text>
      </Pressable>

      <GrownUpGate
        challenge="add"
        visible={gate}
        onCancel={() => setGate(false)}
        onUnlock={() => {
          setGate(false);
          setOptions(true);
        }}
      />
      <UsageSettingsSheet visible={options} childId={child.id} childName={child.name} onClose={() => setOptions(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  body: { alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, textAlign: 'center' },
  line: { color: colors.text, textAlign: 'center' },
  reset: { color: colors.textSecondary, textAlign: 'center' },
  parentLink: { position: 'absolute', bottom: spacing.xxl, padding: spacing.sm },
  parentText: { color: colors.textSecondary, textDecorationLine: 'underline' },
});
