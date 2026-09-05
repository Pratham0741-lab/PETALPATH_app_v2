import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useGarden, useActivateSkill } from '../../hooks/useCurriculum';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography } from '../../theme';
import {
  AppShell,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  SecondaryButton,
  SkillBloom,
  BLOOM_STAGE_ORDER,
  bloomStagePhrase,
  getSubjectVisual,
} from '../../components/design';
import type { GardenSkill, GardenSubject } from '../../types/garden';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';

/**
 * Bloom close-up — the deepest level of "Your Garden", one flower filling the
 * screen.
 *
 * The panorama is the whole garden, the subject screen is one patch; this is a
 * single flower held up close. It answers "how is *this* one doing, and what do
 * I do next with it?" — and it answers the first half without a number. A big
 * bloom shows the stage, a plain phrase names it, and a ladder of the five
 * shapes shows how far along the flower sits from seed to full bloom. Growth is
 * a picture and a word here, never a percentage.
 *
 * Same one source as the rest of the garden (`useGarden`), so the flower here is
 * the identical stage the child tapped. What you can *do* mirrors the existing
 * skill screen exactly, so this adds a friendlier face without a second set of
 * rules: an un-started flower can be started (the real activate mutation), an
 * engaged one sends you to the journey where its practice lives, and a locked
 * one is honest that it isn't ready. "See details" keeps the fuller,
 * parent-facing skill screen one quiet tap away.
 */

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Hero flower size — big enough that the stage shape carries the screen. */
const HERO_BLOOM = 150;
/** Each rung of the seed→bloom ladder. */
const LADDER_BLOOM = 34;

/**
 * The ladder: all five shapes seed→bloom, the flower's own stage lit and the
 * rest dimmed, so a child sees *where along* the flower sits — progress as a
 * place in a sequence, not a score. Purely decorative; the phrase above it
 * already says the stage aloud.
 */
const BloomLadder: React.FC<{ current: GardenSkill['stage']; tint: string }> = ({
  current,
  tint,
}) => {
  return (
    <View
      style={styles.ladder}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {BLOOM_STAGE_ORDER.map((stage) => {
        const isCurrent = stage === current;
        return (
          <SkillBloom
            key={stage}
            stage={stage}
            size={LADDER_BLOOM}
            tint={tint}
            decorative
            style={isCurrent ? styles.ladderCurrent : styles.ladderDim}
          />
        );
      })}
    </View>
  );
};

const BloomDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { skillId: string } }, 'params'>>();
  const { skillId } = route.params;
  const { navigateToTab, navigateTo } = useAppNavigation();

  const { data, isLoading, isError, error, refetch } = useGarden();
  const activateSkill = useActivateSkill();

  // The garden endpoint nests its payload: { data: { subjects, totals } }.
  const subjects: GardenSubject[] = data?.data?.subjects ?? [];

  const found = useMemo(() => {
    for (const subject of subjects) {
      for (const skill of subject.skills ?? []) {
        if (skill.skillId === skillId) {
          return { skill, subjectName: subject.name, displayOrder: subject.displayOrder ?? 0 };
        }
      }
    }
    return null;
  }, [subjects, skillId]);

  const goToJourney = useCallback(() => navigateToTab('Journey'), [navigateToTab]);
  const seeDetails = useCallback(
    () => navigateTo('SkillDetail', { skillId }),
    [navigateTo, skillId],
  );
  const handleActivate = useCallback(() => {
    if (skillId) activateSkill.mutate(skillId);
  }, [skillId, activateSkill]);

  const title = found?.skill.title ?? 'Flower';
  const header = (
    <PageHeader
      title={title}
      subtitle={found?.subjectName}
      showBack
      backFallback={goToJourney}
    />
  );

  if (isLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <LoadingSpinner label="Opening this flower…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't open this flower"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </AppShell>
    );
  }

  if (!found) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            icon="search"
            title="Flower not found"
            message="This flower isn't in your garden yet. Head back and pick another."
          />
        </View>
      </AppShell>
    );
  }

  const { skill, subjectName, displayOrder } = found;
  const visual = getSubjectVisual(subjectName, displayOrder);

  const isAvailable = skill.state === 'AVAILABLE';
  const isEngaged = skill.state === 'ACTIVE' || skill.state === 'COMPLETED';
  const isLocked = skill.state === 'LOCKED';

  const growthPhrase = capitalize(bloomStagePhrase(skill.stage));

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore}
      header={header}
      footer={
        <View style={styles.footer}>
          {isAvailable ? (
            <PrimaryButton
              label="Start growing"
              icon="seedling"
              onPress={handleActivate}
              loading={activateSkill.isPending}
            />
          ) : null}
          {isEngaged ? (
            <PrimaryButton label="Practice" icon="play" onPress={goToJourney} />
          ) : null}
          <SecondaryButton label="See details" icon="search" onPress={seeDetails} />
        </View>
      }
    >
      <View style={styles.hero}>
        {/* The flower itself, large. Decorative: the phrase below speaks its
            stage, so a screen reader hears it once, in words. */}
        <SkillBloom
          stage={skill.stage}
          thirsty={skill.needsWater}
          size={HERO_BLOOM}
          tint={visual.color}
          backgroundColor={visual.soft}
          decorative
        />

        <Text style={[typography.presets.section, styles.phrase]}>{growthPhrase}</Text>

        {skill.needsWater ? (
          <Text style={[typography.presets.body, styles.water]}>
            Time to water — a little practice brings it back.
          </Text>
        ) : null}

        <BloomLadder current={skill.stage} tint={visual.color} />
        <Text style={[typography.presets.caption, styles.ladderCaption]}>
          From seed to full bloom
        </Text>

        {isLocked ? (
          <View style={styles.lockRow}>
            <PetalIcon name="lock" size={18} color={colors.textSecondary} />
            <Text style={[typography.presets.body, styles.lockText]}>
              Not ready to grow yet — finish the flowers before it.
            </Text>
          </View>
        ) : null}
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
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  phrase: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  water: {
    color: colors.blueDark,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  ladder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  ladderCurrent: {
    opacity: 1,
  },
  /* Dimmed, not hidden: the un-reached shapes still show where the flower is
     headed, so the lit one reads as a place on a path. */
  ladderDim: {
    opacity: 0.3,
  },
  ladderCaption: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  lockText: {
    color: colors.textSecondary,
    textAlign: 'center',
    flexShrink: 1,
  },
  footer: {
    gap: spacing.sm,
  },
});

export default BloomDetailScreen;
