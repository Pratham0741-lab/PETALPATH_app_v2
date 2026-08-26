import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useCurriculumInsights } from '../../hooks/useParentAnalytics';
import {
  AppShell,
  PageHeader,
  ParentRow,
  ParentSection,
  PetalIcon,
  ProgressRing,
  StatePanel,
} from '../../components/design';
import type { PetalIconName } from '../../components/design';
import { CurriculumProgressCard, DataSection } from '../../components/analytics';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { badgeSizes, breakpoints, colors, progressSizes, radius, spacing, typography, layoutSizes } from '../../theme';
import type { CurriculumInsight } from '../../services/api/analyticsApi';

/**
 * Curriculum Insights (spec §26) — where the child is in the curriculum, how
 * fast they are moving through it, and what is next.
 *
 * The previous version said several things twice: the roadmap ring appeared at
 * 100px near the top and again at 140px at the bottom (plus a bar underneath
 * repeating the same percentage), and the modules/lessons counts appeared both in
 * `CurriculumProgressCard` and in a hand-rolled "Progress Summary" card with its
 * own track-and-fill bars. One ring, one pair of bars, same numbers.
 *
 * The three health colours were also hardcoded hexes (#8DBB75, #F2A15F, #E57373)
 * that belong to no palette in the app — tokens now, with the label in near-black
 * on the tint and the state carried by an icon as well as a colour (§7, §30).
 */

type Health = CurriculumInsight['curriculumHealth'];

interface HealthVisual {
  label: string;
  icon: PetalIconName;
  tint: string;
  fg: string;
}

const HEALTH: Record<Health, HealthVisual> = {
  good: { label: 'Good', icon: 'check', tint: colors.greenSoft, fg: colors.successDark },
  needs_attention: { label: 'Needs Attention', icon: 'info', tint: colors.warningLight, fg: colors.warning },
  behind: { label: 'Behind', icon: 'warning', tint: colors.errorLight, fg: colors.errorDark },
};

const MILESTONE_ICON: Record<'module' | 'category', PetalIconName> = {
  module: 'explore',
  category: 'book',
};

export const CurriculumInsightsScreen: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();
  const isTabletOrDesktop = screenWidth >= breakpoints.mobileMax;

  const curriculum = useCurriculumInsights();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await curriculum.refetch();
    setRefreshing(false);
  }, [curriculum]);

  const data: CurriculumInsight | undefined = curriculum.data?.data;

  const modulesTotal = data ? data.modulesCompleted + data.modulesRemaining : 0;
  const lessonsTotal = data ? data.lessonsCompleted + data.lessonsRemaining : 0;

  const header = (
    <PageHeader
      title="Curriculum Insights"
      subtitle={data?.currentCurriculum ?? 'Progress through the curriculum'}
      centered={false}
    />
  );

  if (curriculum.isLoading) {
    return (
      <AppShell petals="light" header={header}>
        <Skeleton variant="card" height={152} style={styles.block} />
        <Skeleton variant="card" height={188} style={styles.block} />
        <Skeleton variant="card" height={200} style={styles.block} />
      </AppShell>
    );
  }

  if (curriculum.error) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel minHeight={220}>
          <ErrorState
            title="Could not load curriculum insights"
            message={curriculum.error.message}
            onRetry={() => curriculum.refetch()}
          />
        </StatePanel>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell petals="light" header={header}>
        <StatePanel minHeight={220}>
          <EmptyState
            icon="book"
            title="No curriculum data"
            message="Curriculum insights will appear once your child starts a curriculum."
          />
        </StatePanel>
      </AppShell>
    );
  }

  const health = HEALTH[data.curriculumHealth];

  return (
    <AppShell
      petals="light"
      header={header}
      contentContainerStyle={isTabletOrDesktop ? styles.contentTablet : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <ParentSection title="Current Curriculum" icon="book" boxed>
        <View style={styles.curriculumRow}>
          <View style={styles.curriculumInfo}>
            <Text style={typography.presets.section}>{data.currentCurriculum}</Text>
            <Text style={[typography.presets.caption, styles.muted]}>
              {modulesTotal} modules · {lessonsTotal} lessons
            </Text>
          </View>
          <View style={styles.ringWrap}>
            <ProgressRing
              value={data.roadmapCompletion}
              size={progressSizes.ringSizeLarge}
              stroke={progressSizes.ringStrokeLarge}
              color={colors.secondary}
              accessibilityLabel={`Roadmap ${Math.round(data.roadmapCompletion)} percent complete`}
            >
              <Text style={[typography.presets.cardTitle, styles.ringValue]}>
                {Math.round(data.roadmapCompletion)}%
              </Text>
            </ProgressRing>
            <Text style={[typography.presets.caption, styles.muted]}>Roadmap</Text>
          </View>
        </View>
      </ParentSection>

      <CurriculumProgressCard
        modulesCompleted={data.modulesCompleted}
        modulesTotal={modulesTotal}
        lessonsCompleted={data.lessonsCompleted}
        lessonsTotal={lessonsTotal}
        style={styles.block}
      />

      <ParentSection title="Pace" subtitle="How the current curriculum is going" icon="clock" boxed>
        <ParentRow
          label="Average lesson completion"
          value={`${Math.round(data.averageLessonCompletion)}%`}
          icon="chart"
          iconColor={colors.primary}
        />
        <ParentRow
          label="Estimated to finish"
          value={`${data.estimatedCompletionDays} days`}
          icon="calendar"
          iconColor={colors.secondary}
          divided
        />
        <ParentRow
          label="Curriculum health"
          icon="heart"
          iconColor={health.fg}
          divided
          right={
            <View
              style={[styles.healthPill, { backgroundColor: health.tint }]}
              accessible
              accessibilityLabel={`Curriculum health: ${health.label}`}
            >
              <PetalIcon name={health.icon} size={badgeSizes.sm.iconSize} color={health.fg} />
              <Text
                style={[typography.presets.caption, styles.healthLabel]}
                numberOfLines={1}
              >
                {health.label}
              </Text>
            </View>
          }
        />
      </ParentSection>

      <DataSection
        title="Next Milestones"
        subtitle="Coming up, soonest first"
        icon="star"
        boxed
        empty={data.nextMilestones.length === 0}
        emptyTitle="No upcoming milestones"
        emptyMessage="Complete more lessons to unlock milestones."
        emptyIcon="star"
      >
        {data.nextMilestones.map((milestone, index) => (
          <ParentRow
            key={`milestone-${index}`}
            label={milestone.title}
            description={milestone.type === 'module' ? 'Module' : 'Category'}
            value={`~${milestone.etaDays}d`}
            icon={MILESTONE_ICON[milestone.type]}
            iconColor={colors.primary}
            divided={index > 0}
          />
        ))}
      </DataSection>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  contentTablet: {
    maxWidth: layoutSizes.report,
    alignSelf: 'center',
    width: '100%',
  },
  block: {
    marginBottom: spacing.xl,
  },
  muted: {
    color: colors.textSecondary,
  },

  // -------------------------------------------------------- current curriculum
  curriculumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  curriculumInfo: {
    // Wraps to two lines rather than shoving the ring off the card at 360px.
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  ringWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  ringValue: {
    color: colors.text,
  },

  // -------------------------------------------------------------------- health
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: badgeSizes.sm.height,
    paddingHorizontal: badgeSizes.sm.paddingHorizontal,
    borderRadius: radius.pill,
  },
  healthLabel: {
    color: colors.text,
    fontWeight: '800',
    flexShrink: 1,
  },
});

export default CurriculumInsightsScreen;
