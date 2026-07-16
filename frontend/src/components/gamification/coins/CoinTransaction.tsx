import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../../theme';

interface CoinTransactionProps {
  label: string;
  amount: number;
  date: string;
}

const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const CoinTransaction: React.FC<CoinTransactionProps> = ({ label, amount, date }) => {
  const isPositive = amount >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name="cash" size={20} color={colors.yellow} />
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.date}>{formatDate(date)}</Text>
      </View>
      <Text style={[styles.amount, { color: isPositive ? colors.green : colors.error }]}>
        {isPositive ? '+' : ''}{amount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
    flexDirection: 'column',
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
  date: {
    fontSize: typography.sizes.small,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginTop: 2,
  },
  amount: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    fontFamily: typography.families.rounded,
  },
});
