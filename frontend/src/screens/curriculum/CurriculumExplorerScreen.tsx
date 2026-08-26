import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useCurriculum } from '../../hooks/useCurriculum';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, progressSizes } from '../../theme';
import {
  AppShell,
  Card,
  IconButton,
  LessonStatus,
  PageHeader,
  PetalIcon,
  ProgressIndicator,
  SceneBand,
  StatusBadge,
  SubjectCard,
} from '../../components/design';

/**
 * Explore (spec §14) — subjects, each expanding to its skills.
 *
 * Unchanged behaviour: `useCurriculum()` is still the only data source, and
 * tapping "View" still navigates to `SkillDetail`. The one structural change
 * is that the View button is now a sibling of the row's toggle instead of a
 * Pressable nested inside another Pressable, which is unreliable on Android —
 * both the toggle and the navigation keep working, more predictably.
 */

/** Backend skill states -> the design system's badge vocabulary. */
const STATE_TO_STATUS: Record<string, LessonStatus> = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  ACTIVE: 'current',
  COMPLETED: 'completed',
};

const CurriculumExplorerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, isError, error, refetch, isFetching } = useCurriculum();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  const subjects = data?.data ?? [];

  /**
   * Skills finished across the whole curriculum, as a percentage — what the
   * garden at the foot of the screen is drawn from.
   *
   * Every subject row already counts its own `COMPLETED` skills for its progress
   * bar, so this is the same figure summed rather than a new claim. Curriculum-
   * wide rather than per-subject on purpose: the band is the long view, and a
   * garden that changed every time a subject was expanded would be a chart, not a
   * place.
   */
  const gardenProgress = useMemo(() => {
    let total = 0;
    let done = 0;
    subjects.forEach((subject: any) => {
      const skills = subject.skills ?? [];
      total += skills.length;
      done += skills.filter((s: any) => s.state === 'COMPLETED').length;
    });
    return total > 0 ? (done / total) * 100 : 0;
  }, [subjects]);

  // Rendered as a bottom tab (no back arrow) and also pushed as a stack screen.
  const showBack = useMemo(() => {
    try {
      return navigation.getState?.()?.type !== 'tab';
    } catch {
      return false;
    }
  }, [navigation]);

  const toggleSubject = useCallback((subjectId: string) => {
    setExpandedSubject((prev) => (prev === subjectId ? null : subjectId));
    setExpandedSkills(new Set());
  }, []);

  const toggleSkill = useCallback((skillId: string) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  }, []);

  const handleSkillPress = useCallback(
    (skillId: string) => {
      navigation.navigate('SkillDetail', { skillId });
    },
    [navigation],
  );

  const header = (
    <PageHeader
      title="Explore"
      subtitle="Pick a subject to see its skills"
      showBack={showBack}
      centered={false}
    />
  );

  if (isLoading) {
    return (
      <AppShell withBottomNav petals="light" scroll={false} header={header}>
        <View style={styles.center}>
          <LoadingSpinner label="Loading curriculum…" />
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell withBottomNav petals="light" scroll={false} header={header}>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load curriculum"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </AppShell>
    );
  }

  if (subjects.length === 0) {
    return (
      <AppShell withBottomNav petals="light" scroll={false} header={header}>
        <View style={styles.center}>
          <EmptyState
            title="No curriculum available"
            message="Curriculum content will appear here when it's ready."
          />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell
      withBottomNav
      petals="light"
      sky
      /* The same garden as Home, drawn from the same kind of number — skills
         finished rather than lessons — so the two tabs read as one world. */
      scene={
        <SceneBand
          progress={gardenProgress}
          caption="Every skill you finish opens a flower"
        />
      }
      header={header}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {subjects.map((subject: any, subjectIdx: number) => {
        const isSubjectOpen = expandedSubject === subject.id;
        const skills = subject.skills ?? [];
        const completedCount = skills.filter((s: any) => s.state === 'COMPLETED').length;

        return (
          <SubjectCard
            key={subject.id}
            name={subject.name}
            skillCount={skills.length}
            completedCount={completedCount}
            index={subjectIdx}
            expanded={isSubjectOpen}
            onPress={() => toggleSubject(subject.id)}
          >
            {skills.length === 0 ? (
              <Text style={[typography.presets.caption, styles.emptySkills]}>
                No skills in this subject yet.
              </Text>
            ) : (
              skills.map((skill: any, skillIdx: number) => {
                const status = STATE_TO_STATUS[skill.state] ?? 'locked';
                const isSkillOpen = expandedSkills.has(skill.id);
                const locked = status === 'locked';

                return (
                  <View
                    key={skill.id}
                    style={[styles.skillBlock, skillIdx > 0 && styles.skillDivided]}
                  >
                    {/* Toggle and "View" are siblings, never nested pressables. */}
                    <View style={styles.skillRow}>
                      <Pressable
                        onPress={() => toggleSkill(skill.id)}
                        accessibilityRole="button"
                        accessibilityLabel={skill.name}
                        accessibilityState={{ expanded: isSkillOpen }}
                        style={({ pressed }) => [styles.skillTap, pressed && styles.pressed]}
                      >
                        <View style={styles.skillText}>
                          <Text
                            numberOfLines={2}
                            style={[
                              typography.presets.subtle,
                              { color: locked ? colors.textMuted : colors.text },
                            ]}
                          >
                            {skill.name}
                          </Text>
                          <View style={styles.skillMeta}>
                            <StatusBadge status={status} size="sm" />
                            {skill.difficulty > 0 ? (
                              <Text style={[typography.presets.caption, styles.difficulty]}>
                                Level {skill.difficulty}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <PetalIcon
                          name={isSkillOpen ? 'arrowUp' : 'arrowDown'}
                          size={16}
                          color={colors.textMuted}
                        />
                      </Pressable>

                      <IconButton
                        icon="forward"
                        size="sm"
                        variant="soft"
                        onPress={() => handleSkillPress(skill.id)}
                        accessibilityLabel={`View ${skill.name}`}
                        accessibilityHint="Opens the skill details"
                      />
                    </View>

                    {isSkillOpen && (skill.description || skill.masteryScore > 0) ? (
                      <Card variant="muted" padding="compact" style={styles.skillDetail}>
                        {skill.description ? (
                          <Text style={[typography.presets.caption, styles.description]}>
                            {skill.description}
                          </Text>
                        ) : null}

                        {skill.masteryScore > 0 ? (
                          <View style={styles.masteryBlock}>
                            <View style={styles.masteryHead}>
                              <Text style={[typography.presets.caption, styles.masteryLabel]}>
                                Mastery
                              </Text>
                              <Text style={[typography.presets.caption, styles.masteryValue]}>
                                {Math.round(skill.masteryScore)}%
                              </Text>
                            </View>
                            <ProgressIndicator
                              value={Math.min(skill.masteryScore, 100)}
                              height={progressSizes.barHeightThin}
                              color={colors.purple}
                              accessibilityLabel={`${skill.name} mastery`}
                            />
                          </View>
                        ) : null}

                        {skill.masteryState ? (
                          <Text style={[typography.presets.caption, styles.masteryState]}>
                            {String(skill.masteryState).replace(/_/g, ' ').toLowerCase()}
                          </Text>
                        ) : null}
                      </Card>
                    ) : null}
                  </View>
                );
              })
            )}
          </SubjectCard>
        );
      })}
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
  pressed: {
    opacity: 0.7,
  },
  emptySkills: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  skillBlock: {
    paddingVertical: spacing.xs,
  },
  skillDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skillTap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
  },
  skillText: {
    flex: 1,
    minWidth: 0,
  },
  skillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  difficulty: {
    color: colors.textMuted,
  },
  skillDetail: {
    marginTop: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  masteryBlock: {
    marginTop: spacing.sm,
  },
  masteryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  masteryLabel: {
    color: colors.textSecondary,
  },
  masteryValue: {
    color: colors.purple,
  },
  masteryState: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    textTransform: 'capitalize',
  },
});

export default CurriculumExplorerScreen;
