import React, { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useGarden } from '../../hooks/useCurriculum';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { toUserMessage } from '../../api/errors';
import { colors, radius, spacing, typography } from '../../theme';
import {
  AppShell,
  PageHeader,
  SceneBand,
  SkillBloom,
  bloomStageLabel,
  getSubjectVisual,
} from '../../components/design';
import type { GardenSkill, GardenSubject } from '../../types/garden';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';

/**
 * Subject Garden — the focused patch, one level into "Your Garden".
 *
 * The panorama shows every subject as a patch; tapping one lands here, where
 * that patch fills the screen and every skill in it is a flower the child can
 * tap. It answers "what's growing in this patch, and which one do I want?"
 * without a single line the child has to read: the flowers' shapes carry it.
 *
 * Same one source as the panorama and the close-up (`useGarden`), so a flower
 * shows the identical stage here that it showed on the patch it came from. The
 * backend owns every stage and thirst flag; this screen only lays the flowers
 * out and routes a tap to that flower's close-up.
 */

/** Flower size inside a tile — comfortably above the point petals stop reading (§30). */
const TILE_BLOOM = 64;

/**
 * One tappable flower in the patch. The whole tile is the target (well past the
 * 48px minimum), the flower and its name are drawn inside, and the name is kept
 * to two lines so a long skill title never blows the grid apart.
 */
const BloomTile: React.FC<{
  skill: GardenSkill;
  tint: string;
  soft: string;
  onPress: () => void;
}> = ({ skill, tint, soft, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${skill.title}. ${bloomStageLabel(skill.stage, skill.needsWater)}.`}
      accessibilityHint="Opens this flower"
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <SkillBloom
        stage={skill.stage}
        thirsty={skill.needsWater}
        size={TILE_BLOOM}
        tint={tint}
        backgroundColor={soft}
        decorative
      />
      <Text style={[typography.presets.caption, styles.tileLabel]} numberOfLines={2}>
        {skill.title}
      </Text>
    </Pressable>
  );
};

const SubjectGardenScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { subjectId: string } }, 'params'>>();
  const { subjectId } = route.params;
  const { navigateToTab, navigateTo } = useAppNavigation();

  const { data, isLoading, isError, error, refetch, isFetching } = useGarden();

  // The garden endpoint nests its payload: { data: { subjects, totals } }.
  const subjects: GardenSubject[] = data?.data?.subjects ?? [];

  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId) ?? null,
    [subjects, subjectId],
  );

  const goToJourney = useCallback(() => navigateToTab('Journey'), [navigateToTab]);

  const handleBloomPress = useCallback(
    (skillId: string) => navigateTo('BloomDetail', { skillId }),
    [navigateTo],
  );

  const title = subject?.name ?? 'Patch';
  const header = (
    <PageHeader
      title={title}
      subtitle="Every skill here is a flower"
      showBack
      backFallback={goToJourney}
      centered={false}
    />
  );

  if (isLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <LoadingSpinner label="Growing this patch…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't open this patch"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </AppShell>
    );
  }

  if (!subject) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            icon="search"
            title="Patch not found"
            message="This patch isn't in your garden yet. Head back and pick another."
          />
        </View>
      </AppShell>
    );
  }

  const visual = getSubjectVisual(subject.name, subject.displayOrder ?? 0);

  if (subject.skillCount === 0) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            icon="seedling"
            title="This patch is empty"
            message="Flowers will appear here as skills become ready to grow."
          />
        </View>
      </AppShell>
    );
  }

  /**
   * The foot names the one thing to do — water a fading flower — and otherwise
   * how to use the patch. Growth itself is spoken by the ground's fill, driven
   * by the same live figure the panorama banded the patch from.
   */
  const caption =
    subject.thirstyCount > 0
      ? `${subject.thirstyCount} ${subject.thirstyCount === 1 ? 'flower needs' : 'flowers need'} watering — tap it to practice`
      : "Tap a flower to see how it's growing";

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore}
     
      sky
      scene={<SceneBand progress={subject.growthPercent} caption={caption} />}
      header={header}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={visual.color} />
      }
    >
      <View style={styles.grid}>
        {subject.skills.map((skill) => (
          <BloomTile
            key={skill.skillId}
            skill={skill}
            tint={visual.color}
            soft={visual.soft}
            onPress={() => handleBloomPress(skill.skillId)}
          />
        ))}
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  /* Flowers wrap onto as many rows as they need; a fixed tile width keeps them
     planted in neat rows on any screen without percentage-and-gap math. */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  tile: {
    width: 104,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
  },
  tilePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  tileLabel: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default SubjectGardenScreen;
