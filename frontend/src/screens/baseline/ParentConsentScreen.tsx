/**
 * Parental consent, asked once before the first child profile is created.
 * Plain language; stores the consent version and time (features/baseline/consent.ts).
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppShell, Card, PageHeader, PetalIcon, PrimaryButton } from '../../components/design';
import { useAppStore } from '../../store/appStore';
import { recordConsent } from '../../features/baseline/consent';
import { colors, radius, spacing, typography } from '../../theme';

export const ParentConsentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const userId = useAppStore((s) => s.user?.id);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const accept = async () => {
    if (!userId || !agreed) return;
    setSaving(true);
    try {
      await recordConsent(userId);
      navigation.replace('AddChild');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell petals="none" scroll header={<PageHeader title="Before we begin" />}>
      <View style={styles.body}>
        <Card variant="raised" padding="roomy">
          <Text style={[typography.presets.cardTitle, styles.heading]}>What we keep about your child</Text>
          <View style={styles.points}>
            <Text style={[typography.presets.body, styles.point]}>
              • Their first name, age, avatar and learning companion, so the app can greet them and choose lessons for their age.
            </Text>
            <Text style={[typography.presets.body, styles.point]}>
              • Their learning progress, including a short starting check of what they already know. This is stored only
              against a random ID, never with their name.
            </Text>
            <Text style={[typography.presets.body, styles.point]}>
              • We never keep their photo or birth date, and we never record their voice or camera for the starting check.
            </Text>
            <Text style={[typography.presets.body, styles.point]}>
              • You can delete a child's profile and its data at any time from the profile settings.
            </Text>
          </View>
        </Card>

        <Pressable
          onPress={() => setAgreed((a) => !a)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          style={styles.check}
        >
          <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <PetalIcon name="check" size={18} color={colors.white} /> : null}</View>
          <Text style={[typography.presets.body, styles.checkText]}>
            I am this child's parent or guardian, and I agree to PetalPath storing this information.
          </Text>
        </Pressable>

        <PrimaryButton label="Continue" iconRight="forward" size="lg" fullWidth disabled={!agreed || !userId} loading={saving} onPress={accept} />
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingVertical: spacing.lg },
  heading: { color: colors.text, marginBottom: spacing.sm },
  points: { gap: spacing.sm },
  point: { color: colors.textSecondary },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.purple },
  checkText: { flex: 1, color: colors.text },
});

export default ParentConsentScreen;
