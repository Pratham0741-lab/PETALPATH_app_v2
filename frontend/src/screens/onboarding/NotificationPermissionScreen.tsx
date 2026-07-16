import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../store/notificationStore';
import { notificationService } from '../../services/notifications';
import { colors, spacing, typography, radius, shadows } from '../../theme';

interface BenefitItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const BENEFITS: BenefitItem[] = [
  {
    icon: 'school-outline',
    title: 'Learning Reminders',
    description: 'Never miss a lesson with gentle reminders for your child\'s study time.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Progress Updates',
    description: 'Get notified when your child completes activities and reaches milestones.',
  },
  {
    icon: 'gift-outline',
    title: 'Rewards & Achievements',
    description: 'Celebrate every star earned and achievement unlocked along the way.',
  },
];

export const NotificationPermissionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const setNotificationsEnabled = useNotificationStore((s) => s.setNotificationsEnabled);
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnable = useCallback(async () => {
    setIsRequesting(true);
    try {
      const granted = await notificationService.requestPermission();
      setNotificationsEnabled(granted);
    } catch {
      setNotificationsEnabled(false);
    } finally {
      setIsRequesting(false);
      navigation.navigate('Tutorial');
    }
  }, [navigation, setNotificationsEnabled]);

  const handleMaybeLater = useCallback(() => {
    setNotificationsEnabled(false);
    navigation.navigate('Tutorial');
  }, [navigation, setNotificationsEnabled]);

  const handleSkip = useCallback(() => {
    setNotificationsEnabled(false);
    navigation.navigate('Tutorial');
  }, [navigation, setNotificationsEnabled]);

  return (
    <Screen scroll padded safeBottom>
      <View style={styles.container}>
        <View style={styles.iconArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="notifications" size={48} color={colors.white} />
          </View>
        </View>

        <Text style={styles.title}>Stay Updated!</Text>
        <Text style={styles.subtitle}>
          Get the most out of PetalPath with timely notifications
        </Text>

        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.benefitIconWrapper}>
                <Ionicons name={benefit.icon} size={24} color={colors.purple} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDesc}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionsContainer}>
          <Button
            label="Enable Notifications"
            onPress={handleEnable}
            variant="primary"
            loading={isRequesting}
            disabled={isRequesting}
            fullWidth
            accessibilityLabel="Enable notifications to get learning reminders and updates"
          />
          <Button
            label="Maybe Later"
            onPress={handleMaybeLater}
            variant="outline"
            fullWidth
            accessibilityLabel="Maybe later, skip for now"
          />
          <Button
            label="Skip"
            onPress={handleSkip}
            variant="ghost"
            fullWidth
            accessibilityLabel="Skip notification setup"
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  iconArea: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.lineHeights.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  benefitsList: {
    width: '100%',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#F5ECFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  benefitDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    lineHeight: typography.lineHeights.xs,
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.md,
  },
});

export default NotificationPermissionScreen;
