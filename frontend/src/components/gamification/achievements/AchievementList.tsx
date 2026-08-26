/**
 * AchievementList — the child's achievements, stacked.
 *
 * Redesign notes: this used to render its own `ScrollView` with `flex: 1` while
 * `AchievementsScreen` already scrolls, so it was a vertical scroll view nested
 * inside a vertical scroll view with no height to flex against — the list
 * collapsed. It is a plain `View` now; the screen scrolls.
 *
 * Loading and empty use `StatePanel`, which gives their `flex: 1` centring a
 * minimum height to work with inside scrolling content.
 */

import React from 'react';
import { View } from 'react-native';

import { StatePanel } from '../../design';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { EmptyState } from '../../common/EmptyState';
import AchievementCard from './AchievementCard';

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  category?: string;
}

interface AchievementListProps {
  achievements: AchievementItem[];
  onAchievementPress?: (id: string) => void;
  isLoading?: boolean;
}

const AchievementList: React.FC<AchievementListProps> = ({
  achievements,
  onAchievementPress,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <StatePanel minHeight={140}>
        <LoadingSpinner label="Loading achievements" />
      </StatePanel>
    );
  }

  if (!achievements || achievements.length === 0) {
    return (
      <StatePanel>
        <EmptyState
          icon="trophy"
          title="No achievements yet"
          message="Keep learning and they will start unlocking."
        />
      </StatePanel>
    );
  }

  return (
    <View>
      {achievements.map((item) => (
        <AchievementCard
          key={item.id}
          name={item.name}
          description={item.description}
          progress={item.progress}
          target={item.target}
          completed={item.completed}
          category={item.category}
          onPress={onAchievementPress ? () => onAchievementPress(item.id) : undefined}
        />
      ))}
    </View>
  );
};

export default AchievementList;
