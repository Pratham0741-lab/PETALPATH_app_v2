import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../../theme';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import XPTransactionItem from './XPTransactionItem';

interface XPTransaction {
  id: string;
  label: string;
  amount: number;
  date: string;
}

interface XPHistoryListProps {
  transactions: XPTransaction[];
  isLoading?: boolean;
}

const XPHistoryList: React.FC<XPHistoryListProps> = ({ transactions, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <LoadingSpinner label="Loading XP history" />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        message="No XP history yet"
        />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {transactions.map((tx) => (
        <XPTransactionItem
          key={tx.id}
          label={tx.label}
          amount={tx.amount}
          date={tx.date}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  center: {
    flex: 1,
  },
});

export default XPHistoryList;
