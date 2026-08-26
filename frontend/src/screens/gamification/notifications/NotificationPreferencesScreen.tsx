import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import {
  AppShell,
  Card,
  PageHeader,
  ParentRow,
  ParentSection,
  PetalIcon,
} from '../../../components/design';
import type { PetalIconName } from '../../../components/design';
import { useNotificationStore } from '../../../store/notificationStore';

/**
 * Notification Preferences (spec §26, §35) — reached from the bell in the
 * Rewards header.
 *
 * Restyled onto `AppShell` + `PageHeader` + `ParentSection`/`ParentRow` so it
 * matches the rest of the grown-up surfaces: it was the last reachable screen
 * still on `ScreenContainer` + `TopBar` + `AppCard`, with Ionicons glyphs (§7)
 * and a hand-rolled 50×28 pill switch that had no accessible label and a 28px
 * touch target — under the 44px minimum (§30). `ParentRow`'s `toggle` gives a
 * platform `Switch` with the row label attached and a 48px row.
 *
 * The two intro paragraphs became the page title and subtitle rather than a
 * heading stacked on top of a heading.
 *
 * The seven category switches are still session-only `useState`, exactly as
 * before — there is no preferences endpoint and no persisted slice behind them,
 * so wiring one up would be inventing behaviour rather than restyling it.
 * What is real is `notificationStore.notificationsEnabled`, which
 * `notificationService` sets from the actual OS permission result. When the
 * system is blocking PetalPath, the categories are disabled and the screen says
 * why, instead of offering seven live-looking switches that cannot deliver
 * anything.
 */

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
  /** Says what actually arrives — "XP Earned" on its own is opaque. */
  description: string;
  icon: PetalIconName;
  iconColor: string;
}

const PREFERENCE_ROWS: PreferenceRow[] = [
  {
    key: 'dailyReminder',
    label: 'Daily Reminder',
    description: 'A nudge to practice at the usual time',
    icon: 'clock',
    iconColor: colors.primary,
  },
  {
    key: 'streakReminder',
    label: 'Streak Reminder',
    description: 'A heads-up before a streak runs out',
    icon: 'flame',
    iconColor: colors.warning,
  },
  {
    key: 'xpEarned',
    label: 'XP Earned',
    description: 'When your child earns XP for finished work',
    icon: 'star',
    iconColor: colors.accent,
  },
  {
    key: 'badgeUnlocked',
    label: 'Badge Unlocked',
    description: 'When a new badge is unlocked',
    icon: 'medal',
    iconColor: colors.secondary,
  },
  {
    key: 'challengeReminder',
    label: 'Challenge Reminder',
    description: 'When a daily challenge is waiting',
    icon: 'trophy',
    iconColor: colors.blue,
  },
  {
    key: 'lessonReminder',
    label: 'Lesson Reminder',
    description: 'When a lesson is ready to continue',
    icon: 'book',
    iconColor: colors.successDark,
  },
  {
    key: 'reinforcementReminder',
    label: 'Reinforcement Reminder',
    description: 'When a skill is due for another pass',
    icon: 'replay',
    iconColor: colors.lavender,
  },
];

export const NotificationPreferencesScreen: React.FC = () => {
  const systemAllowed = useNotificationStore((state) => state.notificationsEnabled);

  const [preferences, setPreferences] = useState<Preferences>({
    dailyReminder: true,
    streakReminder: true,
    xpEarned: true,
    badgeUnlocked: true,
    challengeReminder: true,
    lessonReminder: true,
    reinforcementReminder: true,
  });

  const toggle = useCallback((key: PreferenceKey) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <AppShell
      petals="light"
      header={
        <PageHeader
          title="Notifications"
          subtitle="Choose what PetalPath can remind you about"
          centered={false}
        />
      }
    >
      {!systemAllowed ? (
        <Card accent={colors.warning} rail style={styles.notice}>
          <View style={styles.noticeHead}>
            <PetalIcon name="warning" size={20} color={colors.warning} />
            <Text style={typography.presets.cardTitle}>Notifications are turned off</Text>
          </View>
          <Text style={[typography.presets.caption, styles.noticeBody]}>
            PetalPath does not have permission to send notifications on this device. Allow them in
            your device settings and these reminders will start arriving.
          </Text>
        </Card>
      ) : null}

      <ParentSection
        title="Reminders"
        subtitle="Turn on the ones that help your child stay engaged"
        icon="notifications"
        boxed
        footnote="Reminders are sent based on your child's learning activity."
      >
        {PREFERENCE_ROWS.map((row, index) => (
          <ParentRow
            key={row.key}
            label={row.label}
            description={row.description}
            icon={row.icon}
            iconColor={row.iconColor}
            divided={index > 0}
            toggle={{
              value: preferences[row.key],
              onValueChange: () => toggle(row.key),
              disabled: !systemAllowed,
            }}
          />
        ))}
      </ParentSection>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  notice: {
    marginBottom: spacing.xl,
  },
  noticeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  noticeBody: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default NotificationPreferencesScreen;
