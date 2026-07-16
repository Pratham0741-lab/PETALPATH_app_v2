import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';

interface CoinCardProps {
  balance: number;
  earnedToday?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const CoinCard: React.FC<CoinCardProps> = ({ balance, earnedToday, onPress, style }) => {
  return (
    <AppCard onPress={onPress} style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="cash" size={36} color={colors.yellow} />
        </View>
        <View style={styles.info}>
          <Text style={styles.balance}>{balance.toLocaleString()}</Text>
          <Text style={styles.subtitle}>coins</Text>
        </View>
      </View>
      {earnedToday !== undefined && earnedToday > 0 && (
        <View style={styles.earnedWrap}>
          <Ionicons name="arrow-up-circle" size={16} color={colors.green} />
          <Text style={styles.earned}>+{earnedToday} today</Text>
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadows.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flexDirection: 'column',
  },
  balance: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  earnedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  earned: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.green,
    fontFamily: typography.families.rounded,
    marginLeft: spacing.xs,
  },
});
