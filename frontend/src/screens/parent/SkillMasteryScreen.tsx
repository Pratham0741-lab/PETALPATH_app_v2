import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSkillMasteryDetailed } from '../../hooks/useParentAnalytics';
import {
  AppShell,
  Card,
  PageHeader,
  ParentRow,
  PetalIcon,
  ProgressIndicator,
  SegmentedTabs,
  StatePanel,
} from '../../components/design';
import type { SegmentedTabItem } from '../../components/design';
import { SkillDistributionCard } from '../../components/analytics';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { SearchBar } from '../../components/ui/SearchBar';
import {
  MASTERY_STATE_LABELS,
  MASTERY_STATE_ORDER,
  toMasteryStateName,
} from '../../services/api/masteryTypes';
import type { MasteryStateName, SkillMasteryView } from '../../services/api/masteryTypes';
import { badgeSizes, colors, progressSizes, radius, spacing, typography } from '../../theme';

/**
 * Skill Mastery (spec §26) — every tracked skill, searchable and sortable.
 *
 * Rewired onto the real response. This screen used to type
 * `/mastery/child/:childId` as `[{ category, skills: [...] }]` and call
 * `cat.skills.map(...)` on each entry; the endpoint returns a flat list, so the
 * first child with a single skill-health row would have crashed the screen
 * inside its own `useMemo`. It never did only because the table stayed empty
 * until the engine was wired to the completion path. Grouping is done here now,
 * by curriculum domain, which is what the old `category` was standing in for.
 *
 * The state vocabulary is the engine's, too. The four words this screen invented
 * ('mastered' / 'in_progress' / 'needs_practice' / 'locked') matched nothing the
 * server sends — the enum is `NEW | LEARNING | WEAK | STRONG | MASTERED`, in
 * uppercase — so every skill fell through to the default and the whole table
 * reported "Learning". Five states are shown now, in one order (worst first),
 * shared with the sort, the filters and the distribution legend.
 *
 * Scores are today's. The server applies the forgetting curve before answering,
 * so a skill last practiced three weeks ago reports what it has decayed to; when
 * that differs from the stored figure the row says so rather than quietly
 * contradicting the number this screen showed last month.
 *
 * Styling notes from the earlier pass still hold: the state colours are tokens
 * (§29), the chip draws its label in near-black on a tint with a coloured dot
 * carrying the hue (§30), and the sort chips say "Lowest first" / "Highest
 * first" with real SVG arrows instead of arrow glyphs (§7).
 */

type SortKey = 'name' | 'score_asc' | 'score_desc' | 'state';

const SORT_ITEMS: SegmentedTabItem<SortKey>[] = [
  { key: 'name', label: 'Name' },
  { key: 'score_asc', label: 'Lowest first', icon: 'arrowUp' },
  { key: 'score_desc', label: 'Highest first', icon: 'arrowDown' },
  { key: 'state', label: 'State' },
];

/**
 * Bar and dot colour per state — a ramp from "needs help" to "done", not five
 * unrelated hues. Red for LEARNING, which is the bottom band and not the middle
 * one its name suggests; warning orange for WEAK just above it; blue for
 * holding, green for finished, and grey for a skill not yet met.
 *
 * The ramp follows `MASTERY_STATE_ORDER`, which carries the band boundaries. It
 * used to give LEARNING a calm purple and WEAK the only warning colour, which
 * put the softer treatment on the worse score.
 */
const STATE_COLORS: Record<MasteryStateName, string> = {
  LEARNING: colors.error,
  WEAK: colors.warning,
  NEW: colors.textMuted,
  STRONG: colors.blue,
  MASTERED: colors.success,
};

/** Chip background per state. The word on top of it is always `colors.text`. */
const STATE_TINTS: Record<MasteryStateName, string> = {
  LEARNING: colors.errorLight,
  WEAK: colors.warningLight,
  NEW: colors.skeleton,
  STRONG: colors.blueSoft,
  MASTERED: colors.greenSoft,
};

const MasteryBadge: React.FC<{ state: MasteryStateName }> = ({ state }) => (
  <View style={[styles.badge, { backgroundColor: STATE_TINTS[state] }]}>
    <View style={[styles.dot, { backgroundColor: STATE_COLORS[state] }]} />
    <Text style={styles.badgeText}>{MASTERY_STATE_LABELS[state]}</Text>
  </View>
);

const SkillRow: React.FC<{ skill: SkillMasteryView }> = ({ skill }) => (
  <Card variant="flat" padding="compact" style={styles.skillCard}>
    <View style={styles.skillTop}>
      <View style={styles.skillNameWrap}>
        <Text style={[typography.presets.body, styles.skillName]} numberOfLines={2}>
          {skill.skillName}
        </Text>
        {/*
          Only when the decay has actually cost something. Saying "was 86, now
          79" is the difference between a number that looks wrong and a number
          that explains itself.
        */}
        {skill.isSlipping ? (
          <Text style={[typography.presets.caption, styles.slipping]}>
            {`Was ${Math.round(skill.storedScore)}% ${
              skill.daysSincePractice === 0
                ? 'earlier today'
                : skill.daysSincePractice === 1
                  ? 'yesterday'
                  : `${skill.daysSincePractice} days ago`
            }`}
          </Text>
        ) : null}
      </View>
      <MasteryBadge state={skill.masteryState} />
    </View>
    <ProgressIndicator
      value={skill.masteryScore}
      height={progressSizes.barHeightThin}
      color={STATE_COLORS[skill.masteryState]}
      showPercentage
      style={styles.skillBar}
      accessibilityLabel={`${skill.skillName}, ${MASTERY_STATE_LABELS[skill.masteryState]}, ${Math.round(
        skill.masteryScore,
      )} percent`}
    />
  </Card>
);

export const SkillMasteryScreen: React.FC = () => {
  const { data: masteryData, isLoading, isError, error, refetch } = useSkillMasteryDetailed();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MasteryStateName | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /**
   * The response, normalised.
   *
   * `toMasteryStateName` is applied even though the server sends the enum
   * directly: this is the one place a stale cached response, or a deployment
   * that predates the projection, can still arrive with a lowercase word, and a
   * skill silently missing from every total is harder to spot than one in the
   * wrong column.
   */
  const allSkills = useMemo<SkillMasteryView[]>(() => {
    const rows = (masteryData?.data ?? []) as SkillMasteryView[];
    return rows.map((row) => ({
      ...row,
      masteryState: toMasteryStateName(row.masteryState),
    }));
  }, [masteryData]);

  /** One group per curriculum domain, alphabetical. */
  const rawSections = useMemo(() => {
    const byDomain = new Map<string, SkillMasteryView[]>();
    allSkills.forEach((skill) => {
      const key = skill.domain || 'General';
      const bucket = byDomain.get(key);
      if (bucket) bucket.push(skill);
      else byDomain.set(key, [skill]);
    });
    return [...byDomain.entries()]
      .map(([domain, skills]) => ({ domain, skills }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }, [allSkills]);

  const counts = useMemo(() => {
    const tally: Record<MasteryStateName, number> = {
      LEARNING: 0,
      WEAK: 0,
      NEW: 0,
      STRONG: 0,
      MASTERED: 0,
    };
    allSkills.forEach((skill) => {
      tally[skill.masteryState] += 1;
    });
    return tally;
  }, [allSkills]);

  /*
   * The engine's own judgement, not a score cutoff and not a single state.
   *
   * This card has been wrong twice. It first listed anything under 50, which
   * missed a skill at 62 the engine had already banded WEAK. It was then narrowed
   * to `masteryState === 'WEAK'`, which is worse in a quieter way: WEAK is
   * 40-59, so a skill at 30 — the worst kind there is — sat in LEARNING and was
   * left out of "Skills Needing Attention" entirely.
   *
   * `priority` is the server's banding of the same question, and it comes from
   * the review cadence: 'high' is exactly the set the engine wants back
   * tomorrow. Reading it here means this card cannot disagree with the queue.
   */
  const weakSkills = useMemo(
    () =>
      allSkills
        .filter((skill) => skill.priority === 'high')
        .sort((a, b) => b.priorityScore - a.priorityScore || a.masteryScore - b.masteryScore),
    [allSkills],
  );

  const masteryGroups = useMemo(
    () =>
      MASTERY_STATE_ORDER.map((state) => ({
        label: MASTERY_STATE_LABELS[state],
        count: counts[state],
        color: STATE_COLORS[state],
      })),
    [counts],
  );

  const filterItems: SegmentedTabItem<MasteryStateName | 'all'>[] = useMemo(
    () => [
      { key: 'all' as const, label: 'All', count: String(allSkills.length) },
      ...MASTERY_STATE_ORDER.map((state) => ({
        key: state,
        label: MASTERY_STATE_LABELS[state],
        count: String(counts[state]),
      })),
    ],
    [allSkills.length, counts],
  );

  const sectionListSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rawSections
      .map((section) => {
        let skills = section.skills;

        if (query) {
          skills = skills.filter((s) => s.skillName.toLowerCase().includes(query));
        }

        if (activeFilter !== 'all') {
          skills = skills.filter((s) => s.masteryState === activeFilter);
        }

        skills = [...skills].sort((a, b) => {
          switch (sortKey) {
            case 'name':
              return a.skillName.localeCompare(b.skillName);
            case 'score_asc':
              return a.masteryScore - b.masteryScore;
            case 'score_desc':
              return b.masteryScore - a.masteryScore;
            case 'state':
              return (
                MASTERY_STATE_ORDER.indexOf(a.masteryState) -
                MASTERY_STATE_ORDER.indexOf(b.masteryState)
              );
            default:
              return 0;
          }
        });

        return { title: section.domain, data: skills };
      })
      .filter((s) => s.data.length > 0);
  }, [rawSections, searchQuery, activeFilter, sortKey]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; data: SkillMasteryView[] } }) => (
      <View style={styles.categoryHeader}>
        <Text
          style={[typography.presets.eyebrow, styles.categoryTitle]}
          accessibilityRole="header"
          numberOfLines={2}
        >
          {section.title}
        </Text>
        <Text style={[typography.presets.caption, styles.categoryCount]}>
          {section.data.length}
        </Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: SkillMasteryView }) => <SkillRow skill={item} />,
    [],
  );

  const keyExtractor = useCallback((item: SkillMasteryView) => item.skillId, []);

  const header = (
    <PageHeader title="Skill Mastery" subtitle="Every skill your child is tracking" centered={false} />
  );

  if (isLoading) {
    return (
      <AppShell petals="light" header={header}>
        <SkillDistributionCard masteryGroups={[]} loading style={styles.block} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="card" height={92} style={styles.block} />
        ))}
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <ErrorState
            title="Couldn't load skill mastery"
            message={(error as Error)?.message ?? 'An error occurred loading skill mastery data.'}
            onRetry={() => refetch()}
          />
        </StatePanel>
      </AppShell>
    );
  }

  if (allSkills.length === 0) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel>
          <EmptyState
            icon="medal"
            title="No skills tracked yet"
            message="Complete lessons to build skill mastery data."
          />
        </StatePanel>
      </AppShell>
    );
  }

  return (
    <AppShell petals="light" scroll={false} padded={false} header={header}>
      <SectionList
        sections={sectionListSections}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <SkillDistributionCard masteryGroups={masteryGroups} style={styles.block} />

            {weakSkills.length > 0 ? (
              <Card accent={colors.warning} rail style={styles.block}>
                <View style={styles.weakHead}>
                  <PetalIcon name="warning" size={20} color={colors.warning} />
                  <Text style={typography.presets.cardTitle}>Skills Needing Attention</Text>
                </View>
                {weakSkills.slice(0, 5).map((skill, i) => (
                  <ParentRow
                    key={skill.skillId}
                    label={skill.skillName}
                    description={`${Math.round(skill.gap)} points below the ${Math.round(
                      skill.threshold,
                    )}% it needs`}
                    value={`${Math.round(skill.masteryScore)}%`}
                    divided={i > 0}
                  />
                ))}
              </Card>
            ) : null}

            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search skills"
              style={styles.block}
            />

            <Text style={[typography.presets.caption, styles.controlLabel]}>Show</Text>
            <SegmentedTabs
              items={filterItems}
              selected={activeFilter}
              onSelect={setActiveFilter}
              layout="scroll"
              accessibilityLabel="Filter skills by state"
              style={styles.block}
            />

            <Text style={[typography.presets.caption, styles.controlLabel]}>Sort by</Text>
            <SegmentedTabs
              items={SORT_ITEMS}
              selected={sortKey}
              onSelect={setSortKey}
              layout="scroll"
              accessibilityLabel="Sort skills"
              style={styles.block}
            />
          </>
        }
        ListEmptyComponent={
          <StatePanel>
            <EmptyState
              icon="search"
              title="Nothing matches"
              message="No skills match your search or filter."
            />
          </StatePanel>
        }
      />
    </AppShell>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  block: {
    marginBottom: spacing.lg,
  },
  controlLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  // --------------------------------------------------------------- weak skills
  weakHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  // ------------------------------------------------------------- category rows
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    color: colors.textSecondary,
    /* Section titles come from the curriculum and share a `space-between` row
       with the count, which is the one thing here that must never be pushed
       off-screen. */
    flexShrink: 1,
  },
  categoryCount: {
    color: colors.textMuted,
  },

  // ---------------------------------------------------------------- skill rows
  skillCard: {
    marginBottom: spacing.sm,
  },
  skillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  skillNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  skillName: {
    color: colors.text,
  },
  slipping: {
    color: colors.textMuted,
  },
  skillBar: {
    marginTop: spacing.xs,
  },

  // -------------------------------------------------------------------- badges
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: badgeSizes.sm.height,
    paddingHorizontal: badgeSizes.sm.paddingHorizontal,
    borderRadius: radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.presets.caption,
    color: colors.text,
    fontWeight: '800',
  },
});

export default SkillMasteryScreen;
