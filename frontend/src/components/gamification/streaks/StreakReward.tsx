import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { AppButton } from '../../buttons/AppButton';

interface StreakRewardProps {
  day: number;
  reward: string;
  claimed: boolean;
  onClaim?: () => void;
  style?: StyleProp<ViewStyle>;
}

const StreakReward: React.FC<StreakRewardProps> = ({
  day,
  reward,
  claimed,
  onClaim,
  style,
}) => {
  return (
    <AppCard style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.day}>Day {day}</Text>
          <Text style={styles.reward}>{reward}</Text>
        </View>
        <AppButton
          variant="success"
          label={claimed ? 'Claimed' : 'Claim'}
          disabled={claimed}
          onPress={() => onClaim?.()}
          style={styles.button}
        />
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
  },
  day: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  reward: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  button: {
    minWidth: 88,
  },
});

export default StreakReward;
