import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { AppButton } from '../../buttons/AppButton';

interface Props {
  reward: string;
  claimed: boolean;
  onClaim?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ChallengeReward: React.FC<Props> = ({ reward, claimed, onClaim, style }) => {
  return (
    <AppCard style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="gift" size={24} color={colors.blue} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>Reward</Text>
          <Text style={styles.reward}>{reward}</Text>
        </View>
      </View>
      <AppButton
        label={claimed ? 'Claimed' : 'Claim'}
        variant="success"
        disabled={claimed}
        onPress={() => onClaim?.()}
        style={styles.button}
      />
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.blue + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
  reward: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  button: {
    alignSelf: 'stretch',
  },
});
