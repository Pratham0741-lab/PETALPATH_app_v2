/**
 * BadgeCard — one tile in the badge grid. Handles both earned and unearned
 * badges; `BadgeDetailCard` is the larger detail-screen variant.
 *
 * Redesign notes (§5, §7, §30): Ionicons medal/checkmark become the `medal`,
 * `check` and `lock` PetalIcons, and the tile is a design-system `Card` instead
 * of an `AppCard` with its own radius and shadow. Because it lives in a ~160px
 * grid cell at 360px, the layout is centred and vertical rather than the old
 * side-by-side row, which used to push the "Locked" pill off the tile (§27).
 *
 * Earned state is no longer carried by colour alone: an earned badge gets a
 * green check mark and an unearned one gets a lock glyph plus the word
 * "Locked", so the distinction survives colour blindness (§30).
 */

import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import { Card, IconWell, ProgressIndicator } from '../../design';
import { PetalIcon } from '../../icons';

interface BadgeCardProps {
  name: string;
  description?: string | null;
  imagePath?: string | null;
  earned: boolean;
  earnedAt?: string | null;
  progress?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({
  name,
  description,
  imagePath,
  earned,
  progress,
  onPress,
  style,
}) => {
  return (
    <Card
      variant={earned ? 'raised' : 'muted'}
      padding="compact"
      onPress={onPress}
      style={style}
      accessibilityLabel={
        earned ? `${name}, earned` : `${name}, locked${description ? `. ${description}` : ''}`
      }
      accessibilityHint={onPress ? 'Opens badge details' : undefined}
    >
      <View style={styles.artWrap}>
        {imagePath ? (
          <Image
            source={{ uri: imagePath }}
            style={[styles.image, !earned && styles.imageLocked]}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <IconWell
            icon="medal"
            color={earned ? colors.primary : colors.textMuted}
            soft={earned ? colors.primaryLight : colors.skeleton}
            size={60}
            filled={earned}
          />
        )}
        <View style={[styles.marker, earned ? styles.markerEarned : styles.markerLocked]}>
          <PetalIcon
            name={earned ? 'check' : 'lock'}
            size={13}
            color={colors.white}
            filled
            strokeWidth={2.4}
          />
        </View>
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>

      {description ? (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      ) : null}

      {earned ? (
        <Text style={styles.earnedLabel}>Earned</Text>
      ) : (
        <ProgressIndicator
          value={progress ?? 0}
          height={6}
          color={colors.primary}
          style={styles.progress}
          accessibilityLabel={`${Math.round(progress ?? 0)} percent towards this badge`}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  artWrap: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  imageLocked: {
    opacity: 0.55,
  },
  marker: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEarned: {
    backgroundColor: colors.leafGreen,
  },
  markerLocked: {
    backgroundColor: colors.textMuted,
  },
  name: {
    ...typography.presets.cardTitle,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  earnedLabel: {
    ...typography.presets.caption,
    color: colors.successDark,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  progress: {
    marginTop: spacing.sm,
  },
});

export default BadgeCard;
