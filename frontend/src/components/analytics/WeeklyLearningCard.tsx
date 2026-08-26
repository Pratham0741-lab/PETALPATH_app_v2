import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { ActivityBucketsCard } from './ActivityBucketsCard';

interface WeeklyLearningCardProps {
  buckets: Array<{ label: string; total: number }>;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function WeeklyLearningCard({ buckets, loading = false, style }: WeeklyLearningCardProps) {
  return (
    <ActivityBucketsCard
      title="This Week"
      icon="calendar"
      buckets={buckets}
      totalNoun="activities this week"
      loading={loading}
      style={style}
    />
  );
}

export default WeeklyLearningCard;
