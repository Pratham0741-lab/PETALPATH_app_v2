/**
 * TopBar — header for the reward/notification detail screens (Badges,
 * Achievements, Daily Challenges, Badge Detail, Notification Centre).
 *
 * It is not the same thing as `PageHeader`: it carries the child's live star
 * total and the notification bell, which the plain page header does not. Its
 * metrics and typography now match `PageHeader` exactly, so a child moving from
 * Rewards into Badges does not cross a visible seam (§35).
 *
 * Redesign notes (§7, §30): every Ionicons glyph is gone — the back chevron is
 * an `IconButton` from the design system, the mentor chip uses the real
 * `AvatarGlyph` instead of a generic paw, and "Next" is a `SecondaryButton`
 * rather than a hand-rolled pink pill whose `#FFF8ED` label belonged to the old
 * dark theme. The props are unchanged, so all five callers keep working.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, headerSizes, radius, spacing, typography } from '../../theme';
import { AvatarGlyph, IconButton, SecondaryButton } from '../design';
import { StarCounter } from '../progress/StarCounter';
import { NotificationBell } from '../notifications/NotificationBell';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor } from '../../constants/mentors';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onNext?: () => void;
  nextLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBack = false,
  onNext,
  nextLabel,
  style,
}) => {
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = activeChild?.mentor ? enhanceMentor(activeChild.mentor) : null;
  const navigation = useNavigation<{ canGoBack: () => boolean; goBack: () => void }>();

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {showBack ? (
          <IconButton
            icon="back"
            variant="surface"
            tone="neutral"
            onPress={handleBack}
            accessibilityLabel="Go back"
          />
        ) : activeMentor ? (
          <View
            accessible
            accessibilityLabel={`Your mentor, ${activeMentor.name}`}
            style={[styles.mentorIndicator, { backgroundColor: `${activeMentor.color}1F` }]}
          >
            <AvatarGlyph species={activeMentor.species} size={24} />
            <Text style={styles.mentorName} numberOfLines={1}>
              {activeMentor.name.split(' ')[0]}
            </Text>
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {onNext ? (
          <SecondaryButton
            label={nextLabel || 'Next'}
            iconRight="forward"
            size="sm"
            onPress={onNext}
            fullWidth={false}
          />
        ) : null}
        <NotificationBell size={22} />
        <StarCounter />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Same metrics as PageHeader so the two never look like different apps.
    minHeight: headerSizes.heightTall,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    // Lets the title truncate instead of shoving the star pill off-screen at
    // 360px (§27).
    minWidth: 0,
  },
  mentorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: 4,
    paddingRight: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  mentorName: {
    ...typography.presets.caption,
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  title: {
    ...typography.presets.section,
    color: colors.text,
    flexShrink: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

export default TopBar;
