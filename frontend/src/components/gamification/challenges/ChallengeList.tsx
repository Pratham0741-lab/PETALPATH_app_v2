/**
 * ChallengeList — the day's challenges, stacked.
 *
 * Redesign notes: this used to render its own `ScrollView` with `flex: 1`. Both
 * screens that use it already scroll, so it was a vertical scroll view nested in
 * a vertical scroll view with no height to flex against — the list collapsed and
 * whichever challenges did render could not be scrolled to. It is a plain `View`
 * now and the parent screen does the scrolling.
 *
 * The loading and empty states use `StatePanel` for the same reason: both centre
 * themselves with `flex: 1`, which needs a minimum height inside scrolling
 * content.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../theme';
import { StatePanel } from '../../design';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { EmptyState } from '../../common/EmptyState';
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
      <StatePanel minHeight={140}>
        <LoadingSpinner label="Loading challenges" />
      </StatePanel>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <StatePanel>
        <EmptyState
          icon="sparkle"
          title="No challenges right now"
          message="New challenges arrive every day. Check back soon!"
        />
      </StatePanel>
    );
  }

  return (
    <View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    marginBottom: spacing.md,
  },
});

export default ChallengeList;
