import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radius, shadows } from '../../../theme';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
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
      <View style={styles.center}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!achievements || achievements.length === 0) {
    return <EmptyState message="No achievements available yet" />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {achievements.map((item) => (
        <AchievementCard
          key={item.id}
          name={item.name}
          description={item.description}
          progress={item.progress}
          target={item.target}
          completed={item.completed}
          category={item.category}
          onPress={
            onAchievementPress
              ? () => onAchievementPress(item.id)
              : undefined
          }
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
});

export default AchievementList;
