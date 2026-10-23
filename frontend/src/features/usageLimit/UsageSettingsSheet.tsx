/**
 * Parent options for the daily limit: 10 extra minutes today, change the limit
 * (10-60 minutes), or turn it off. Only ever shown behind a parent gate (the
 * lock screen's addition gate, or the profile's unlocked parent section).
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { IconButton, PrimaryButton, SecondaryButton } from '../../components/design';
import { colors, radius, spacing, typography } from '../../theme';
import { LIMIT_MAX_MINUTES, LIMIT_MIN_MINUTES } from './usageTimer';
import { useUsageStore } from './usageStore';

const STEP = 5;

export const UsageSettingsSheet: React.FC<{
  visible: boolean;
  childId: string;
  childName: string;
  onClose: () => void;
}> = ({ visible, childId, childName, onClose }) => {
  // Re-render on any status change so the numbers stay current.
  useUsageStore((s) => s.status);
  const store = useUsageStore.getState();
  const { limitMinutes, enabled } = store.settings(childId);
  const locked = !!useUsageStore.getState().status?.locked;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={[typography.presets.cardTitle, styles.title]}>Daily learning time · {childName}</Text>

          {locked ? (
            <PrimaryButton
              label="Give 10 more minutes today"
              icon="clock"
              fullWidth
              onPress={async () => {
                await store.grantExtra(childId);
                onClose();
              }}
            />
          ) : null}

          <View style={styles.row}>
            <Text style={[typography.presets.body, styles.label]}>Daily limit</Text>
            <View style={styles.stepper}>
              <IconButton
                icon="arrowDown"
                accessibilityLabel="Less time"
                disabled={!enabled || limitMinutes <= LIMIT_MIN_MINUTES}
                onPress={() => store.setLimit(childId, limitMinutes - STEP)}
              />
              <Text style={[typography.presets.cardTitle, styles.value]}>{limitMinutes} min</Text>
              <IconButton
                icon="arrowUp"
                accessibilityLabel="More time"
                disabled={!enabled || limitMinutes >= LIMIT_MAX_MINUTES}
                onPress={() => store.setLimit(childId, limitMinutes + STEP)}
              />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={[typography.presets.body, styles.label]}>Daily limit on</Text>
            <Switch value={enabled} onValueChange={(v) => store.setEnabled(childId, v)} accessibilityLabel="Daily limit on" />
          </View>

          {process.env.EXPO_PUBLIC_ENABLE_DEV_TOOLS === 'true' ? (
            // Dev tool (not in release builds): lock quickly to test the flow.
            <SecondaryButton
              label="Debug: 1-minute limit"
              testID="USAGE_DEBUG_ONE_MINUTE"
              onPress={() => store.setDebugOneMinute(childId)}
            />
          ) : null}

          <SecondaryButton label="Done" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: { color: colors.text, minWidth: 72, textAlign: 'center' },
});
