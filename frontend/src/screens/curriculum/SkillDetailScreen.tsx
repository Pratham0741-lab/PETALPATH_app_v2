import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useCurriculum, useActivateSkill } from '../../hooks/useCurriculum';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, cardSizes } from '../../theme';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import {
  AppShell,
  Card,
  IconWell,
  LessonStatus,
  PageHeader,
  PrimaryButton,
  ProgressIndicator,
  SecondaryButton,
  Stat,
  StatGrid,
  StatusBadge,
  getSubjectVisual,
} from '../../components/design';

/**
 * Skill Detail — reached from Explore (spec §14 flow).
 *
 * Behaviour is unchanged: the skill is still resolved out of `useCurriculum()`,
 * "Activate Skill" still fires the `useActivateSkill` mutation, and "Go to
 * Journey" still uses `navigateToTab('Journey')`.
 */

const STATE_TO_STATUS: Record<string, LessonStatus> = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  ACTIVE: 'current',
  COMPLETED: 'completed',
};

/** Turns MASTERY_STATE_LIKE_THIS into "Mastery state like this". */
const humanize = (value?: string | null) => {
  if (!value) return '—';
  const s = String(value).replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const SkillDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { skillId: string } }, 'params'>>();
  const { skillId } = route.params;
  const { navigateToTab } = useAppNavigation();

  const { data, isLoading, isError, error, refetch } = useCurriculum();
  const activateSkill = useActivateSkill();

  const subjects = data?.data ?? [];

  const skillData = React.useMemo(() => {
    for (const subject of subjects) {
      for (const skill of subject.skills ?? []) {
        if (skill.id === skillId) {
          return { skill, subjectName: subject.name, subjectId: subject.id };
        }
      }
    }
    return null;
  }, [subjects, skillId]);

  const handleActivate = useCallback(() => {
    if (skillId) {
      activateSkill.mutate(skillId);
    }
  }, [skillId, activateSkill]);

  const handleGoToJourney = useCallback(() => {
    navigateToTab('Journey');
  }, [navigateToTab]);

  if (isLoading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={<PageHeader title="Skill" />}>
        <View style={styles.center}>
          <LoadingSpinner label="Loading skill…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={<PageHeader title="Skill" />}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load skill"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </AppShell>
    );
  }

  if (!skillData) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore} scroll={false} header={<PageHeader title="Skill" />}>
        <View style={styles.center}>
          <EmptyState
            icon="search"
            title="Skill not found"
            message="This skill could not be found in the curriculum."
          />
        </View>
      </AppShell>
    );
  }

  const { skill, subjectName } = skillData;
  const status = STATE_TO_STATUS[skill.state] ?? 'locked';
  const visual = getSubjectVisual(subjectName);
  const isActivating = activateSkill.isPending;
  const canActivate = skill.state === 'AVAILABLE';
  const mastery = skill.masteryScore ?? 0;

  const stats: Stat[] = [
    {
      value: skill.difficulty > 0 ? `Level ${skill.difficulty}` : '—',
      label: 'Difficulty',
      icon: 'chart',
      color: colors.blue,
    },
    {
      value: humanize(skill.masteryState),
      label: 'Mastery',
      icon: 'star',
      color: colors.yellow,
    },
    {
      value: skill.estimatedAge ? `${skill.estimatedAge}+` : '—',
      label: 'Age',
      icon: 'profile',
      color: colors.purple,
    },
  ];

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.explore}
      header={<PageHeader title={skill.name} backFallback={handleGoToJourney} />}
      footer={
        <View style={styles.footer}>
          {canActivate ? (
            <PrimaryButton
              label="Activate Skill"
              icon="play"
              onPress={handleActivate}
              loading={isActivating}
            />
          ) : null}
          <SecondaryButton label="Go to Journey" icon="explore" onPress={handleGoToJourney} />
        </View>
      }
    >
      {/* Identity */}
      <Card variant="raised" padding="roomy" accent={visual.color} rail style={styles.card}>
        <View style={styles.headerRow}>
          <IconWell
            icon={visual.icon}
            color={visual.color}
            soft={visual.soft}
            size={cardSizes.iconWellLarge}
          />
          <View style={styles.headerInfo}>
            <Text style={[typography.presets.eyebrow, styles.subject]} numberOfLines={1}>
              {subjectName}
            </Text>
            <Text style={[typography.presets.section, styles.title]}>{skill.name}</Text>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge status={status} />
        </View>
      </Card>

      {skill.description ? (
        <Card variant="raised" padding="normal" style={styles.card}>
          <Text style={[typography.presets.cardTitle, styles.sectionTitle]}>What you'll learn</Text>
          <Text style={[typography.presets.body, styles.description]}>{skill.description}</Text>
        </Card>
      ) : null}

      {/* Progress */}
      <Card variant="raised" padding="normal" style={styles.card}>
        <Text style={[typography.presets.cardTitle, styles.sectionTitle]}>Progress</Text>

        <StatGrid stats={stats} />

        {mastery > 0 ? (
          <View style={styles.masteryBlock}>
            <View style={styles.masteryHead}>
              <Text style={[typography.presets.caption, styles.masteryLabel]}>Mastery score</Text>
              <Text style={[typography.presets.caption, styles.masteryValue]}>
                {Math.round(mastery)}%
              </Text>
            </View>
            <ProgressIndicator
              value={Math.min(mastery, 100)}
              color={colors.purple}
              accessibilityLabel={`${skill.name} mastery score`}
            />
          </View>
        ) : null}
      </Card>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    marginBottom: cardSizes.gap,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  subject: {
    color: colors.textSecondary,
  },
  title: {
    color: colors.text,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 21,
  },
  masteryBlock: {
    marginTop: spacing.lg,
  },
  masteryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  masteryLabel: {
    color: colors.textSecondary,
  },
  masteryValue: {
    color: colors.purple,
  },
  footer: {
    gap: spacing.sm,
  },
});

export default SkillDetailScreen;
