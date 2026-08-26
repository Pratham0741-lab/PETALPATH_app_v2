/**
 * Empty state component
 *
 * Generic placeholder shown when a list or section has no data.
 *
 * The `icon` prop used to be an emoji string, which spec §7 rules out for UI
 * iconography. It now accepts a PetalIcon name; legacy emoji (and the couple
 * of leftover Ionicons names) are mapped to the nearest SVG icon so the ~60
 * existing callers keep working and nothing renders an emoji.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon, PetalIconName, PETAL_ICON_NAMES } from '../icons';

/** Legacy emoji / Ionicons names -> the nearest icon in the SVG set. */
const LEGACY_ICONS: Record<string, PetalIconName> = {
  '🌱': 'seedling',
  '🌿': 'seedling',
  '🌸': 'seedling',
  '📚': 'book',
  '📖': 'book',
  '📋': 'book',
  '📝': 'pencil',
  '📜': 'clock',
  '📊': 'chart',
  '📈': 'chart',
  '📅': 'calendar',
  '🔔': 'notifications',
  '🔍': 'search',
  '🏆': 'trophy',
  '🏁': 'trophy',
  '🏅': 'medal',
  '🎯': 'sparkle',
  '💡': 'sparkle',
  '🌟': 'star',
  '⭐': 'star',
  '🎉': 'sparkle',
  '👶': 'profile',
  '🎮': 'play',
  '🪙': 'coin',
  '💬': 'speak',
  'trophy-outline': 'trophy',
  'medal-outline': 'medal',
};

const resolveIcon = (icon?: string): PetalIconName => {
  if (!icon) return 'seedling';
  if ((PETAL_ICON_NAMES as string[]).includes(icon)) return icon as PetalIconName;
  return LEGACY_ICONS[icon] ?? 'seedling';
};

interface EmptyStateProps {
  /** A PetalIcon name. Legacy emoji strings are mapped to one. */
  icon?: PetalIconName | string;
  title?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'Nothing here yet',
  message = 'Once there is something to show, it will appear here.',
}) => {
  return (
    <View style={styles.container} accessibilityRole="text">
      <View style={styles.iconWell}>
        <PetalIcon name={resolveIcon(icon)} size={34} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: spacing.xxl,
  },
  iconWell: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.presets.section,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
