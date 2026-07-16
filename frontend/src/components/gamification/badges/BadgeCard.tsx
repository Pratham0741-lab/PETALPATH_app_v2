import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { ProgressBar } from '../../../components/ui';

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
    <AppCard onPress={onPress} style={[styles.card, style]}>
      <View style={styles.header}>
        {imagePath ? (
          <Image source={{ uri: imagePath }} style={styles.image} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: earned ? colors.lavender : colors.surfaceSecondary }]}>
            <Ionicons name="medal" size={32} color={earned ? colors.purple : colors.textMuted} />
          </View>
        )}
        {earned ? (
          <View style={styles.checkWrap}>
            <Ionicons name="checkmark-circle" size={20} color={colors.green} />
          </View>
        ) : (
          <View style={styles.lockedPill}>
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{name}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {!earned && (
        <View style={styles.progressWrap}>
          <ProgressBar
            progress={progress ?? 0}
            color={colors.purple}
            label="Progress"
          />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedPill: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lockedText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
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
  progressWrap: {
    marginTop: spacing.sm,
  },
});
