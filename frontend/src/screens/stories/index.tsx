import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { SearchBar, Chip, Badge } from '../../components/ui';
import { useStories } from '../../hooks/useStories';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

const CATEGORIES = ['All', 'FICTION', 'NON_FICTION', 'POEM', 'FABLE'] as const;

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

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <LoadingSpinner label="Loading stories..." />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load stories"
            message={toUserMessage(error)}
            onRetry={onRefresh}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.purple} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="book" size={26} color={colors.purple} />
          </View>
          <Text style={styles.headerTitle}>Story Library</Text>
          <Text style={styles.headerSubtitle}>Discover and read magical stories.</Text>
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search stories..."
          style={styles.searchBar}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat === 'All' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              active={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
              style={styles.chip}
            />
          ))}
        </ScrollView>

        {filteredStories.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No stories found"
            message={search ? 'Try a different search term.' : 'No stories available right now.'}
          />
        ) : (
          filteredStories.map((story: any) => (
            <AppCard
              key={story.id}
              style={styles.storyCard}
              onPress={() => navigation.navigate('StoryDetail', { storyId: story.id })}
            >
              <View style={styles.cardRow}>
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="book-outline" size={32} color={colors.purple} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{story.title}</Text>
                  </View>
                  {story.description ? (
                    <Text style={styles.cardDescription} numberOfLines={2}>{story.description}</Text>
                  ) : null}
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.metaText}>{story.estimatedDuration ?? 5} min</Text>
                    </View>
                    {story.category ? (
                      <Badge
                        label={story.category.charAt(0) + story.category.slice(1).toLowerCase()}
                        color={colors.blue}
                        style={styles.categoryBadge}
                      />
                    ) : null}
                    {story.readingLevel ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="trending-up" size={14} color={colors.textMuted} />
                        <Text style={styles.metaText}>Lv {story.readingLevel}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  searchBar: {
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    marginRight: spacing.xs,
  },
  storyCard: {
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  coverPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: `${colors.purple}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  categoryBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
});

export default StoriesScreen;
