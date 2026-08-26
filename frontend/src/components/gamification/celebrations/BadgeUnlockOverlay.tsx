import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { AppButton } from '../../buttons/AppButton';
import { RewardOverlay } from './RewardOverlay';
import { ConfettiOverlay } from './ConfettiOverlay';

interface Props {
  visible: boolean;
  name: string;
  description?: string | null;
  imagePath?: string | null;
  onClose: () => void;
}

export const BadgeUnlockOverlay: React.FC<Props> = ({
  visible,
  name,
  description,
  imagePath,
  onClose,
}) => {
  return (
    <RewardOverlay visible={visible}>
      <ConfettiOverlay visible={visible} />
      <AppCard style={styles.card}>
        <View style={styles.badgeWrap}>
          {imagePath ? (
            <Image source={{ uri: imagePath }} style={styles.badgeImage} />
          ) : (
            <Ionicons name="medal" size={72} color={colors.primary} />
          )}
        </View>
        <Text style={styles.title}>Badge Unlocked!</Text>
        <Text style={styles.name}>{name}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        <AppButton label="Awesome!" variant="primary" onPress={onClose} style={styles.button} />
      </AppCard>
    </RewardOverlay>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.xl,
    width: 280,
  },
  badgeWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeImage: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
  },
  title: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  name: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  description: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
