import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import { ChallengeCard } from './ChallengeCard';

interface ChallengeItem {
  id: string;
  title: string;
  description?: string;
  progress: number;
  target: number;
  reward: string;
  category?: string;
  completed: boolean;
}

interface Props {
  challenges: ChallengeItem[];
  onChallengePress?: (id: string) => void;
  isLoading?: boolean;
}

export const ChallengeList: React.FC<Props> = ({ challenges, onChallengePress, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <View style={styles.center}>
        <EmptyState title="No challenges available right now" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          title={challenge.title}
          description={challenge.description}
          progress={challenge.progress}
          target={challenge.target}
          reward={challenge.reward}
          category={challenge.category}
          completed={challenge.completed}
          onPress={onChallengePress ? () => onChallengePress(challenge.id) : undefined}
          style={styles.item}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  item: {
    marginBottom: spacing.md,
  },
});
