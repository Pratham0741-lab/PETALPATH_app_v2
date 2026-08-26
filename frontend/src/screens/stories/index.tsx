import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { SearchBar } from '../../components/ui';
import {
  AppShell,
  Card,
  IconWell,
  PageHeader,
  PetalIcon,
  SegmentedTabs,
} from '../../components/design';
import type { SegmentedTabItem } from '../../components/design';
import { useStories } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { cardSizes, colors, spacing, typography } from '../../theme';

/**
 * Story Library (spec §35) — search, filter by category, pick something to read.
 *
 * The query, the focus refetch and the client-side title/description filter are
 * unchanged. The chrome moves onto the design system: `PageHeader` instead of a
 * hand-rolled icon-and-title block, `SegmentedTabs` instead of `Chip`s in a
 * nested horizontal `ScrollView`, `Card` rows with an `IconWell` instead of
 * `AppCard` with an Ionicons cover, and the empty state's 📚 becomes the `book`
 * glyph (§7).
 *
 * Two fixes in passing: the category filter printed "Non_fiction" — the label
 * only lower-cased the tail and left the underscore — and each row's three meta
 * fragments were separate spoken items, so the row announced "Cloudy Day", "5",
 * "min", "Fiction", "Lv", "2". The card is now one button that says the whole
 * thing, with a chevron because it really does open something (§30, §33).
 */

const CATEGORIES = ['All', 'FICTION', 'NON_FICTION', 'POEM', 'FABLE'] as const;

/** FICTION → "Fiction", NON_FICTION → "Non fiction". */
const humanize = (value: string) => {
  const s = value.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const CATEGORY_TABS: SegmentedTabItem[] = CATEGORIES.map((cat) => ({
  key: cat,
  label: cat === 'All' ? 'All' : humanize(cat),
}));

export const StoriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const { data, isLoading, isError, error, isFetching, refetch } = useStories(
    useMemo(() => ({
      search: search || undefined,
      category: activeCategory === 'All' ? undefined : activeCategory,
      limit: 50,
    }), [search, activeCategory])
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const stories = data?.data ?? [];

  const filteredStories = useMemo(() => {
    if (!search) return stories;
    const q = search.toLowerCase();
    return stories.filter((s: any) =>
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [stories, search]);

  const header = (
    <PageHeader
      title="Story Library"
      subtitle="Discover and read magical stories"
      centered={false}
    />
  );

  if (isLoading) {
    return (
      <AppShell scroll={false} header={header}>
        <View style={styles.center}>
          <LoadingSpinner label="Loading stories…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load stories"
            message={toUserMessage(error)}
            onRetry={onRefresh}
          />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell
      petals="light"
      header={header}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search stories"
        style={styles.searchBar}
      />

      <SegmentedTabs
        items={CATEGORY_TABS}
        selected={activeCategory}
        onSelect={setActiveCategory}
        layout="scroll"
        accessibilityLabel="Story categories"
        style={styles.tabs}
      />

      {filteredStories.length === 0 ? (
        <StatePanel>
          <EmptyState
            icon="book"
            title="No stories found"
            message={search ? 'Try a different search term.' : 'No stories available right now.'}
          />
        </StatePanel>
      ) : (
        filteredStories.map((story: any) => (
          <StoryRow
            key={story.id}
            story={story}
            onPress={() => navigation.navigate('StoryDetail', { storyId: story.id })}
          />
        ))
      )}
    </AppShell>
  );
};

/** One story in the library. The whole card is the button. */
const StoryRow: React.FC<{ story: any; onPress: () => void }> = ({ story, onPress }) => {
  const minutes = story.estimatedDuration ?? 5;
  const meta = [
    story.category ? humanize(story.category) : null,
    `${minutes} min`,
    story.readingLevel ? `Level ${story.readingLevel}` : null,
  ].filter(Boolean) as string[];

  return (
    <Card
      variant="raised"
      padding="normal"
      onPress={onPress}
      style={styles.storyCard}
      accessibilityLabel={`${story.title}. ${meta.join(', ')}`}
      accessibilityHint="Opens this story"
    >
      <View style={styles.cardRow}>
        <IconWell
          icon="book"
          color={colors.primary}
          soft={colors.primaryLight}
          size={cardSizes.iconWell}
        />
        <View style={styles.cardContent}>
          <Text style={[typography.presets.cardTitle, styles.cardTitle]} numberOfLines={1}>
            {story.title}
          </Text>
          {story.description ? (
            <Text style={[typography.presets.caption, styles.cardDescription]} numberOfLines={2}>
              {story.description}
            </Text>
          ) : null}
          <Text style={[typography.presets.caption, styles.cardMeta]} numberOfLines={1}>
            {meta.join(' · ')}
          </Text>
        </View>
        <PetalIcon name="forward" size={20} color={colors.textSecondary} />
      </View>
    </Card>
  );
};

/**
 * `EmptyState` centres itself with `flex: 1`, which collapses inside a scroll
 * view's auto-height content — the minimum height gives it room.
 */
const StatePanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Card variant="flat" padding="none">
    <View style={styles.panel}>{children}</View>
  </Card>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  panel: {
    minHeight: 240,
    paddingVertical: spacing.md,
  },
  searchBar: {
    marginBottom: spacing.md,
  },
  tabs: {
    marginBottom: spacing.lg,
  },

  storyCard: {
    marginBottom: cardSizes.gap,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    color: colors.text,
  },
  cardDescription: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardMeta: {
    color: colors.textMuted,
    marginTop: 2,
  },
});

export default StoriesScreen;
