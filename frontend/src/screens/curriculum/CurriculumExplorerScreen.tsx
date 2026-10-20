import React, { useCallback } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTwoPane } from '../../hooks/useTwoPane';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useGarden } from '../../hooks/useCurriculum';
import { toUserMessage } from '../../api/errors';
import { colors, radius, spacing, typography } from '../../theme';
import { AppShell, GardenPatch, PageHeader, PetalIcon, SceneBand } from '../../components/design';
import { ProgressAnalysisPanel } from '../../components/progress/ProgressAnalysisPanel';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { SCREEN_ACCENTS } from '../../theme/screenAccents';
import type { GardenSubject } from '../../types/garden';
import { mixWhite, PANEL_ALPHA } from '../../components/design/screenAccent';

/*
 * The My Story banner reads as a highlight without shouting. It used to be solid
 * brand pink, which fought the soft garden scene behind it and was the loudest
 * thing on a screen whose subject is the garden. It now takes a translucent wash
 * of the screen's own accent — stronger than an ordinary card so it still invites
 * a tap, but part of the same composition — with the colour kept as a punch in
 * the icon well rather than across the whole block.
 */
const STORY_FILL = mixWhite(SCREEN_ACCENTS.explore, 0.18, PANEL_ALPHA);
const STORY_BORDER = mixWhite(SCREEN_ACCENTS.explore, 0.45, 0.9);

/**
 * Your Garden — the reworked Explore tab (spec §14).
 *
 * Explore used to be a text catalog: subjects that expanded into rows of skill
 * names, badges and a mastery percentage. None of that is legible to the two-to-
 * six-year-old the app is for. It is now a garden a child can read without
 * reading: every subject is a patch of ground, every skill a flower at its real
 * stage of bloom, and "how am I doing" is answered by how much has flowered
 * rather than by a number.
 *
 * One data source (`useGarden`) feeds the whole flow — this panorama, the focused
 * subject screen, and each bloom's close-up — so the same skill shows the same
 * flower everywhere. The backend owns every stage, thirst flag and growth figure,
 * computed from the child's *live* (decayed) mastery, which is why this screen
 * holds no band logic of its own.
 *
 * Distinct from Home, which is "the path": Home is the ordered next-step journey
 * (a roadmap ribbon); this is the whole garden as a place, laid out as patches.
 */

const CurriculumExplorerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, isError, error, refetch, isFetching } = useGarden();

  // The garden endpoint nests its payload: { data: { subjects, totals } }.
  const subjects: GardenSubject[] = data?.data?.subjects ?? [];
  const totals = data?.data?.totals;

  /**
   * The whole garden's growth, for the scene at the foot — mean live mastery
   * across every flower, the same figure the patches are banded from, so the
   * ground the screen ends on agrees with the patches above it.
   */
  const overallGrowth = totals?.overallGrowthPercent ?? 0;
  const thirstyTotal = totals?.thirstyCount ?? 0;

  // Rendered as a destination (phone tab, tablet sidebar — both routed as
  // `Journey`) with no back arrow, and also pushable as `CurriculumExplorer`.
  // Checking the navigator type put a back arrow on the tablet, whose sidebar
  // destinations live in a stack.
  const route = useRoute();
  const showBack = route.name !== 'Journey';
  const twoPane = useTwoPane();

  const handlePatchPress = useCallback(
    (subjectId: string) => {
      navigation.navigate('SubjectGarden', { subjectId });
    },
    [navigation],
  );

  const handleStoryPress = useCallback(() => {
    navigation.navigate('MyStory');
  }, [navigation]);

  const header = (
    <PageHeader
      accent={SCREEN_ACCENTS.explore}
      title="Your Garden"
      subtitle="Every skill you grow is a flower"
      showBack={showBack}
      centered={false}
    />
  );

  if (isLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} withBottomNav scroll={false} header={header}>
        <View style={styles.center}>
          <LoadingSpinner label="Growing your garden…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} withBottomNav scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't open your garden"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </AppShell>
    );
  }

  if (subjects.length === 0) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} withBottomNav scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            icon="seedling"
            title="Your garden is empty"
            message="Subjects will appear here as patches to grow when they're ready."
          />
        </View>
      </AppShell>
    );
  }

  /**
   * The caption names what the garden is, and — when something is fading — the one
   * thing to do about it. Kept out of the band's own reading order (the band
   * already speaks its growth); the watering nudge is echoed in each patch that
   * needs it, where it is actionable.
   */
  const caption =
    thirstyTotal > 0
      ? `${thirstyTotal} ${thirstyTotal === 1 ? 'flower needs' : 'flowers need'} watering — open its patch to practice`
      : 'Every skill you grow opens a flower';

  return (
    <AppShell
      withBottomNav
      petals="none"
      backgroundImage={SCREEN_BACKGROUNDS.explore} accent={SCREEN_ACCENTS.explore}
      header={header}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {/* "My Story" — the child's progress retold as a comic, above the patches. */}
      <Pressable
        onPress={handleStoryPress}
        accessibilityRole="button"
        accessibilityLabel="My Story"
        accessibilityHint="Opens your learning adventure as a comic"
        style={({ pressed }) => [styles.storyCta, pressed && styles.storyCtaPressed]}
      >
        <View style={styles.storyIcon}>
          <PetalIcon name="book" size={22} color={colors.surface} />
        </View>
        <View style={styles.storyText}>
          <Text style={[typography.presets.cardTitle, styles.storyTitle]}>My Story</Text>
          <Text style={[typography.presets.caption, styles.storySub]}>
            See your learning adventure as a comic
          </Text>
        </View>
        <PetalIcon name="sparkle" size={18} color={SCREEN_ACCENTS.explore} />
      </Pressable>

      {/*
        Two patches a row on a landscape tablet. One per row stretched each
        patch to the full width with its flowers in a small cluster at the
        middle; side by side, every subject's garden fits on one screen and the
        patches read as a garden rather than a list.
      */}
      {(twoPane ? pairs(subjects) : subjects.map((s) => [s])).map((row) => (
        <View key={row[0].id} style={twoPane ? styles.gridRow : null}>
          {row.map((subject) => (
            <GardenPatch
              key={subject.id}
              name={subject.name}
              growthPercent={subject.growthPercent}
              skillCount={subject.skillCount}
              thirstyCount={subject.thirstyCount}
              skills={subject.skills}
              index={subjects.indexOf(subject)}
              onPress={() => handlePatchPress(subject.id)}
              style={twoPane ? styles.gridItem : undefined}
            />
          ))}
          {/* Keeps a lone last patch at half width rather than full. */}
          {twoPane && row.length === 1 ? <View style={styles.gridItem} /> : null}
        </View>
      ))}

      {/* Parent-locked analysis. The child sees only a lock tile; the charts are
          fetched and drawn only after the grown-up gate is passed. */}
      <View style={styles.analysis}>
        <ProgressAnalysisPanel />
      </View>
    </AppShell>
  );
};

/** [a, b, c] → [[a, b], [c]] */
function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  storyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: STORY_FILL,
    borderWidth: 1,
    borderColor: STORY_BORDER,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  storyCtaPressed: {
    opacity: 0.85,
  },
  storyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SCREEN_ACCENTS.explore,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyText: {
    flex: 1,
    minWidth: 0,
  },
  storyTitle: {
    color: colors.text,
  },
  storySub: {
    color: colors.textSecondary,
  },
  analysis: {
    marginTop: spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.lg,
  },
  gridItem: {
    flex: 1,
  },
});

export default CurriculumExplorerScreen;
