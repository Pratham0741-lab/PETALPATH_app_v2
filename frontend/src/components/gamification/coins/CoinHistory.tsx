import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import { CoinTransaction } from './CoinTransaction';

interface CoinTransactionData {
  id: string;
  label: string;
  amount: number;
  date: string;
}

interface CoinHistoryProps {
  transactions: CoinTransactionData[];
  isLoading?: boolean;
}

export const CoinHistory: React.FC<CoinHistoryProps> = ({ transactions, isLoading = false }) => {
  if (isLoading) {
    return <LoadingSpinner label="Loading coin history" />;
  }

  if (transactions.length === 0) {
    return <EmptyState icon="🪙" title="No coin history yet" message="Earn coins by completing lessons and activities." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {transactions.map((tx) => (
        <CoinTransaction key={tx.id} label={tx.label} amount={tx.amount} date={tx.date} />
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
    paddingVertical: 8,
  },
});
