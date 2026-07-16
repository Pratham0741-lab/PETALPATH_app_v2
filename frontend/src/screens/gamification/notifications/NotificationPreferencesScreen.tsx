import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { ScreenContainer } from '../../../components/common/ScreenContainer';
import { TopBar } from '../../../components/navigation/TopBar';
import { AppCard } from '../../../components/cards/AppCard';

type PreferenceKey =
  | 'dailyReminder'
  | 'streakReminder'
  | 'xpEarned'
  | 'badgeUnlocked'
  | 'challengeReminder'
  | 'lessonReminder'
  | 'reinforcementReminder';

type Preferences = Record<PreferenceKey, boolean>;

interface PreferenceRow {
  key: PreferenceKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PREFERENCE_ROWS: PreferenceRow[] = [
  { key: 'dailyReminder', label: 'Daily Reminder', icon: 'alarm' },
  { key: 'streakReminder', label: 'Streak Reminder', icon: 'flame' },
  { key: 'xpEarned', label: 'XP Earned', icon: 'star' },
  { key: 'badgeUnlocked', label: 'Badge Unlocked', icon: 'medal' },
  { key: 'challengeReminder', label: 'Challenge Reminder', icon: 'flag' },
  { key: 'lessonReminder', label: 'Lesson Reminder', icon: 'book' },
  { key: 'reinforcementReminder', label: 'Reinforcement Reminder', icon: 'refresh' },
];

export const NotificationPreferencesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [preferences, setPreferences] = useState<Preferences>({
    dailyReminder: true,
    streakReminder: true,
    xpEarned: true,
    badgeUnlocked: true,
    challengeReminder: true,
    lessonReminder: true,
    reinforcementReminder: true,
  });

  const toggle = (key: PreferenceKey) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScreenContainer>
      <TopBar title="Notification Settings" showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Choose what PetalPath can remind you about.</Text>
        <Text style={styles.subtext}>
          Turn on the reminders that help your child stay engaged with learning.
        </Text>
        <AppCard style={styles.card}>
          {PREFERENCE_ROWS.map((row, index) => {
            const value = preferences[row.key];
            return (
              <View
                key={row.key}
                style={[
                  styles.row,
                  index < PREFERENCE_ROWS.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={styles.rowLabel}>
                  <Ionicons
                    name={row.icon}
                    size={22}
                    color={colors.purple}
                    style={styles.rowIcon}
                  />
                  <Text style={styles.label}>{row.label}</Text>
                </View>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: value }}
                  onPress={() => toggle(row.key)}
                  style={[
                    styles.toggle,
                    { backgroundColor: value ? colors.purple : colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.knob,
                      value ? styles.knobOn : styles.knobOff,
                    ]}
                  />
                </Pressable>
              </View>
            );
          })}
        </AppCard>
        <Text style={styles.note}>
          Reminders are sent based on your child's learning activity.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtext: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  card: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: spacing.sm,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  knobOff: {
    alignSelf: 'flex-start',
  },
  note: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
