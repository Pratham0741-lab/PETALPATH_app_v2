import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { ProgressBar } from '../../../components/ui';

interface LockedBadgeProps {
  name: string;
  description?: string | null;
  imagePath?: string | null;
  progress?: number;
  style?: StyleProp<ViewStyle>;
}

export const LockedBadge: React.FC<LockedBadgeProps> = ({
  name,
  description,
  imagePath,
  progress,
  style,
}) => {
  return (
    <AppCard style={[styles.card, style]}>
      <View style={styles.header}>
        {imagePath ? (
          <Image source={{ uri: imagePath }} style={[styles.image, { opacity: 0.7 }]} />
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name="medal" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={18} color={colors.textInverse} />
        </View>
      </View>
      <Text style={styles.name}>{name}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.lockedPill}>
        <Text style={styles.lockedText}>Locked</Text>
      </View>
      {progress !== undefined && (
        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} color={colors.purple} label="Progress" />
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadows.sm,
    opacity: 0.7,
  },
  header: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSecondary,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
  description: {
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
  },
  lockedPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  lockedText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
  progressWrap: {
    marginTop: spacing.sm,
  },
});
