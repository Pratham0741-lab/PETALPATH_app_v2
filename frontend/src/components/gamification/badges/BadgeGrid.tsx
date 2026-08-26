/**
 * BadgeGrid — two-up grid of badge tiles.
 *
 * Redesign notes (§27, §28): tiles were `width: '45%'` with `space-between`,
 * which left a 10% gutter between two columns and pushed the tile content into
 * roughly 150px at 360px wide. They are 48% now, and the row gap comes from the
 * container rather than a `marginBottom` on each item.
 *
 * The empty state used a `🏅` emoji, which §7 rules out — `EmptyState` maps
 * legacy emoji to SVG glyphs, but the call site should not be asking for one. It
 * also needed wrapping in `StatePanel`: both grids render inside a scroll view,
 * where `EmptyState`'s `flex: 1` centring collapses to nothing.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../theme';
import { StatePanel } from '../../design';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { EmptyState } from '../../common/EmptyState';
import { BadgeCard } from './BadgeCard';

interface BadgeItem {
  id: string;
  name: string;
  description?: string | null;
  imagePath?: string | null;
  earned: boolean;
  earnedAt?: string | null;
  progress?: number;
}

interface BadgeGridProps {
  badges: BadgeItem[];
  onBadgePress?: (id: string) => void;
  isLoading?: boolean;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  onBadgePress,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <StatePanel minHeight={140}>
        <LoadingSpinner label="Loading badges" />
      </StatePanel>
    );
  }

  if (badges.length === 0) {
    return (
      <StatePanel>
        <EmptyState
          icon="medal"
          title="No badges yet"
          message="Complete activities to earn your first badge."
        />
      </StatePanel>
    );
  }

  return (
    <View style={styles.container}>
      {badges.map((badge) => (
        // The width lives on this wrapper, not on the card — a flex/width value
        // on an interactive Card fights its press animation.
        <View key={badge.id} style={styles.item}>
          <BadgeCard
            name={badge.name}
            description={badge.description}
            imagePath={badge.imagePath}
            earned={badge.earned}
            earnedAt={badge.earnedAt}
            progress={badge.progress}
            onPress={onBadgePress ? () => onBadgePress(badge.id) : undefined}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  item: {
    width: '48%',
  },
});

export default BadgeGrid;
