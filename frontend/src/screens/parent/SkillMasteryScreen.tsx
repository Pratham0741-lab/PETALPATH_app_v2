import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { useSkillMasteryDetailed } from '../../hooks/useParentAnalytics';
import { SkillDistributionCard } from '../../components/analytics/SkillDistributionCard';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchBar } from '../../components/ui/SearchBar';

type SkillState = 'mastered' | 'learning' | 'needs_practice' | 'locked';

type SortKey = 'name' | 'score_asc' | 'score_desc' | 'state';

interface SkillItem {
  name: string;
  score: number;
  state: SkillState;
}

interface CategorySection {
  category: string;
  data: SkillItem[];
}

const FILTER_OPTIONS: Array<{ key: SkillState | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'mastered', label: 'Mastered' },
  { key: 'learning', label: 'Learning' },
  { key: 'needs_practice', label: 'Needs Practice' },
  { key: 'locked', label: 'Locked' },
];

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'score_asc', label: 'Score ↑' },
  { key: 'score_desc', label: 'Score ↓' },
  { key: 'state', label: 'State' },
];

const STATE_COLORS: Record<SkillState, string> = {
  mastered: '#4CAF50',
  learning: '#2196F3',
  needs_practice: '#FF9800',
  locked: '#9E9E9E',
};

const STATE_LABELS: Record<SkillState, string> = {
  mastered: 'Mastered',
  learning: 'Learning',
  needs_practice: 'Needs Practice',
  locked: 'Locked',
};

function mapApiState(state: string): SkillState {
  switch (state) {
    case 'mastered':
      return 'mastered';
    case 'in_progress':
    case 'learning':
      return 'learning';
    case 'needs_practice':
    case 'review':
      return 'needs_practice';
    case 'locked':
      return 'locked';
    default:
      return 'learning';
  }
}

function StatsSkeleton() {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.statItem}>
          <Skeleton width={36} height={24} />
          <Skeleton width={60} height={12} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
}

function SkillProgressBar({ score, color }: { score: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(score, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function StateBadge({ state }: { state: SkillState }) {
  const color = STATE_COLORS[state];
  const label = STATE_LABELS[state];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SkillRow({ skill }: { skill: SkillItem }) {
  const { theme: { colors: themeColors } } = useTheme();
  const stateColor = STATE_COLORS[skill.state];

  return (
    <View style={[styles.skillRow, { backgroundColor: themeColors.card }]}>
      <View style={styles.skillTopRow}>
        <Text style={[styles.skillName, { color: themeColors.text }]} numberOfLines={1}>
          {skill.name}
        </Text>
        <StateBadge state={skill.state} />
      </View>
      <View style={styles.skillProgressRow}>
        <SkillProgressBar score={skill.score} color={stateColor} />
        <Text style={[styles.skillScore, { color: themeColors.textSecondary }]}>
          {Math.round(skill.score)}%
        </Text>
      </View>
    </View>
  );
}

export const SkillMasteryScreen: React.FC = () => {
  const { theme: { colors: themeColors } } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation<{ goBack: () => void }>();

  const {
    data: masteryData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSkillMasteryDetailed();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SkillState | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rawSections = useMemo(() => {
    const apiData = (masteryData?.data ?? []) as Array<{ category: string; skills: Array<{ name: string; score: number; state: string }> }>;
    return apiData.map((cat) => ({
      category: cat.category,
      data: cat.skills.map((s) => ({
        name: s.name,
        score: s.score,
        state: mapApiState(s.state),
      })),
    }));
  }, [masteryData]);

  const allSkills = useMemo(() => {
    return rawSections.flatMap((s) => s.data);
  }, [rawSections]);

  const stats = useMemo(() => {
    const total = allSkills.length;
    const mastered = allSkills.filter((s) => s.state === 'mastered').length;
    const learning = allSkills.filter((s) => s.state === 'learning').length;
    const needsPractice = allSkills.filter((s) => s.state === 'needs_practice').length;
    const locked = allSkills.filter((s) => s.state === 'locked').length;
    return { total, mastered, learning, needsPractice, locked };
  }, [allSkills]);

  const weakSkills = useMemo(() => {
    return allSkills.filter((s) => s.score < 50).sort((a, b) => a.score - b.score);
  }, [allSkills]);

  const masteryGroups = useMemo(() => {
    return [
      { label: 'Mastered', count: stats.mastered, color: STATE_COLORS.mastered },
      { label: 'Learning', count: stats.learning, color: STATE_COLORS.learning },
      { label: 'Needs Practice', count: stats.needsPractice, color: STATE_COLORS.needs_practice },
      { label: 'Locked', count: stats.locked, color: STATE_COLORS.locked },
    ];
  }, [stats]);

  const filteredAndSortedSections = useMemo(() => {
    let filteredSections = rawSections.map((section) => {
      let skills = section.data;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        skills = skills.filter((s) => s.name.toLowerCase().includes(query));
      }

      if (activeFilter !== 'all') {
        skills = skills.filter((s) => s.state === activeFilter);
      }

      skills = [...skills].sort((a, b) => {
        switch (sortKey) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'score_asc':
            return a.score - b.score;
          case 'score_desc':
            return b.score - a.score;
          case 'state': {
            const order: SkillState[] = ['mastered', 'learning', 'needs_practice', 'locked'];
            return order.indexOf(a.state) - order.indexOf(b.state);
          }
          default:
            return 0;
        }
      });

      return { ...section, data: skills };
    });

    filteredSections = filteredSections.filter((s) => s.data.length > 0);
    return filteredSections;
  }, [rawSections, searchQuery, activeFilter, sortKey]);

  const sectionListSections = useMemo(() => {
    return filteredAndSortedSections.map((s) => ({
      title: s.category,
      data: s.data,
    }));
  }, [filteredAndSortedSections]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; data: SkillItem[] } }) => (
      <View style={[styles.sectionHeader, { borderBottomColor: themeColors.borderLight }]}>
        <Text style={[styles.sectionHeaderTitle, { color: themeColors.text }]} accessibilityRole="header">
          {section.title}
        </Text>
        <Text style={[styles.sectionHeaderCount, { color: themeColors.textMuted }]}>
          {section.data.length}
        </Text>
      </View>
    ),
    [themeColors],
  );

  const renderItem = useCallback(
    ({ item }: { item: SkillItem }) => <SkillRow skill={item} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: SkillItem, index: number) => `${item.name}-${index}`,
    [],
  );

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <View style={styles.header}>
            <Skeleton variant="circle" width={36} height={36} />
            <Skeleton width={140} height={24} style={{ marginLeft: spacing.sm }} />
          </View>
          <StatsSkeleton />
          <Card>
            <Skeleton variant="text" width={120} height={18} />
            <View style={{ marginTop: spacing.md }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="card" height={70} style={{ marginTop: spacing.sm }} />
              ))}
            </View>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <ErrorState
            title="Couldn't load skill mastery"
            message={(error as Error)?.message ?? 'An error occurred loading skill mastery data.'}
            onRetry={() => refetch()}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (rawSections.length === 0) {
    return (
      <ScreenContainer>
        <View
          style={[styles.scrollContent, { backgroundColor: themeColors.background }]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.warning}18` }]}>
              <Ionicons name="trophy" size={24} color={themeColors.warning} />
            </View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Skill Mastery</Text>
          </View>
          <EmptyState
            title="No skills tracked yet"
            message="Complete lessons to build skill mastery data."
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionList
        sections={sectionListSections}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        accessibilityLabel="Skill Mastery Screen"
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={24} color={themeColors.text} />
              </TouchableOpacity>
              <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.warning}18` }]}>
                <Ionicons name="trophy" size={24} color={themeColors.warning} />
              </View>
              <Text style={[styles.headerTitle, { color: themeColors.text }]}>Skill Mastery</Text>
            </View>

            <SkillDistributionCard masteryGroups={masteryGroups} style={styles.distributionCard} />

            <View style={styles.statsRow} accessibilityLabel="Skill statistics" accessibilityRole="summary">
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{stats.total}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: STATE_COLORS.mastered }]}>{stats.mastered}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Mastered</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: STATE_COLORS.learning }]}>{stats.learning}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Learning</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: STATE_COLORS.needs_practice }]}>{stats.needsPractice}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Practice</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: STATE_COLORS.locked }]}>{stats.locked}</Text>
                <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Locked</Text>
              </View>
            </View>

            {weakSkills.length > 0 && (
              <Card
                variant="outlined"
                style={[styles.weakCard, { borderColor: `${STATE_COLORS.needs_practice}40` }]}
                accessibilityLabel="Weak skills warning"
              >
                <View style={styles.weakHeader}>
                  <Ionicons name="warning" size={20} color={STATE_COLORS.needs_practice} />
                  <Text style={[styles.weakTitle, { color: themeColors.text }]}>
                    Skills Needing Attention
                  </Text>
                </View>
                {weakSkills.slice(0, 5).map((skill) => (
                  <View key={skill.name} style={styles.weakRow}>
                    <Text style={[styles.weakName, { color: themeColors.text }]} numberOfLines={1}>
                      {skill.name}
                    </Text>
                    <Text style={[styles.weakScore, { color: STATE_COLORS.needs_practice }]}>
                      {Math.round(skill.score)}%
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search skills..."
              style={styles.searchBar}
            />

            <View style={styles.filterRow} accessibilityRole="tablist">
              {FILTER_OPTIONS.map((opt) => {
                const isSelected = activeFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.filterChip,
                      isSelected && { backgroundColor: themeColors.primary },
                    ]}
                    onPress={() => setActiveFilter(opt.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter: ${opt.label}`}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? themeColors.textInverse : themeColors.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sortRow}>
              <Text style={[styles.sortLabel, { color: themeColors.textSecondary }]}>Sort by:</Text>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortKey === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.sortChip,
                      isSelected && { backgroundColor: `${themeColors.primary}20` },
                    ]}
                    onPress={() => setSortKey(opt.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Sort by ${opt.label}`}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        { color: isSelected ? themeColors.primary : themeColors.textMuted },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={themeColors.primary} style={{ marginLeft: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {sectionListSections.length > 0 && (
              <Text style={[styles.skillsLabel, { color: themeColors.text }]}>
                Skills by Category
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Ionicons name="search-outline" size={40} color={themeColors.textMuted} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              No skills match your search or filter.
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.md,
  },
  distributionCard: {
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  weakCard: {
    marginBottom: spacing.lg,
  },
  weakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  weakTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  weakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weakName: {
    fontSize: typography.sizes.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  weakScore: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  searchBar: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sortLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  sortChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  skillsLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
  },
  sectionHeaderTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderCount: {
    fontSize: typography.sizes.xs,
  },
  skillRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
  },
  skillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skillName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  skillProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.progress,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.progress,
  },
  skillScore: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    minWidth: 36,
    textAlign: 'right',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
});
