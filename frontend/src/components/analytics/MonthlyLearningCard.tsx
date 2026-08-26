import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { ActivityBucketsCard } from './ActivityBucketsCard';

interface MonthlyLearningCardProps {
  buckets: Array<{ label: string; total: number }>;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MonthlyLearningCard({ buckets, loading = false, style }: MonthlyLearningCardProps) {
  return (
    <ActivityBucketsCard
      title="This Month"
      icon="calendar"
      buckets={buckets}
      totalNoun="activities this month"
      loading={loading}
      style={style}
    />
  );
}

export default MonthlyLearningCard;
