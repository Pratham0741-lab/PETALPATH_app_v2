import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../theme';

interface XPTransactionItemProps {
  label: string;
  amount: number;
  date: string;
}

const XPTransactionItem: React.FC<XPTransactionItemProps> = ({ label, amount, date }) => {
  const isPositive = amount >= 0;
  const formattedDate = new Date(date).toLocaleDateString();

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`${label}, ${amount} XP`}>
      <View style={styles.left}>
        <Ionicons name="star" size={18} color={colors.primary} />
        <View style={styles.textBlock}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </View>
      <Text style={[styles.amount, isPositive ? styles.positive : styles.negative]}>
        {isPositive ? `+${amount}` : `-${Math.abs(amount)}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textBlock: {
    flexDirection: 'column',
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  date: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  amount: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.warning,
  },
});

export default XPTransactionItem;
