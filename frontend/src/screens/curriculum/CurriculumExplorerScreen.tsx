import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { useCurriculum } from '../../hooks/useCurriculum';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

const stateConfig: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  LOCKED: { label: 'Locked', icon: 'lock-closed', color: colors.textMuted },
  AVAILABLE: { label: 'Available', icon: 'lock-open', color: colors.blue },
  ACTIVE: { label: 'Active', icon: 'flame', color: colors.coral },
  COMPLETED: { label: 'Completed', icon: 'checkmark-circle', color: colors.green },
};

const subjectIcons: string[] = ['book', 'calculator', 'pencil', 'color-palette', 'puzzle', 'musical-notes'];

const CurriculumExplorerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, isError, error, refetch, isFetching } = useCurriculum();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  const subjects = data?.data ?? [];

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

  const getSubjectIcon = (index: number): React.ComponentProps<typeof Ionicons>['name'] => {
    return subjectIcons[index % subjectIcons.length] as any;
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <TopBar title="Curriculum Explorer" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Loading curriculum…" />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <TopBar title="Curriculum Explorer" showBack />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load curriculum"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (subjects.length === 0) {
    return (
      <ScreenContainer>
        <TopBar title="Curriculum Explorer" showBack />
        <View style={styles.center}>
          <EmptyState
            icon="🌿"
            title="No curriculum available"
            message="Curriculum content will appear here when it's ready."
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TopBar title="Curriculum Explorer" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.purple} />
        }
      >
        <Text style={styles.header}>Learning Subjects</Text>
        <Text style={styles.subheader}>Explore skills and track your progress across subjects.</Text>

        {subjects.map((subject: any, subjectIdx: number) => {
          const isSubjectOpen = expandedSubject === subject.id;
          const skills = subject.skills ?? [];
          const completedCount = skills.filter((s: any) => s.state === 'COMPLETED').length;
          const iconName = getSubjectIcon(subjectIdx);

          return (
            <View key={subject.id} style={styles.subjectCard}>
              <Pressable
                onPress={() => toggleSubject(subject.id)}
                style={({ pressed }) => [
                  styles.subjectHeader,
                  pressed && styles.subjectHeaderPressed,
                ]}
              >
                <View style={[styles.subjectIcon, { backgroundColor: colors.purple + '18' }]}>
                  <Ionicons name={iconName} size={24} color={colors.purple} />
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectMeta}>
                    {skills.length} skill{skills.length !== 1 ? 's' : ''} · {completedCount} completed
                  </Text>
                </View>
                <Ionicons
                  name={isSubjectOpen ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>

              {isSubjectOpen && (
                <View style={styles.skillsList}>
                  {skills.length === 0 ? (
                    <Text style={styles.emptySkills}>No skills in this subject yet.</Text>
                  ) : (
                    skills.map((skill: any) => {
                      const cfg = stateConfig[skill.state] ?? stateConfig.LOCKED;
                      const isSkillOpen = expandedSkills.has(skill.id);

                      return (
                        <View key={skill.id}>
                          <Pressable
                            onPress={() => toggleSkill(skill.id)}
                            style={({ pressed }) => [
                              styles.skillItem,
                              pressed && styles.skillItemPressed,
                            ]}
                          >
                            <View
                              style={[
                                styles.skillStateIcon,
                                { backgroundColor: cfg.color + '18' },
                              ]}
                            >
                              <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                            </View>
                            <View style={styles.skillInfo}>
                              <Text style={styles.skillName}>{skill.name}</Text>
                              <View style={styles.skillMeta}>
                                <View style={[styles.stateBadge, { backgroundColor: cfg.color + '15' }]}>
                                  <Text style={[styles.stateLabel, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                                {skill.difficulty > 0 && (
                                  <Text style={styles.skillDifficulty}>Lv.{skill.difficulty}</Text>
                                )}
                              </View>
                            </View>
                            <Pressable
                              onPress={() => handleSkillPress(skill.id)}
                              style={styles.viewButton}
                            >
                              <Text style={styles.viewButtonText}>View</Text>
                              <Ionicons name="chevron-forward" size={16} color={colors.purple} />
                            </Pressable>
                          </Pressable>

                          {isSkillOpen && skill.description && (
                            <View style={styles.skillDetail}>
                              <Text style={styles.skillDescription}>{skill.description}</Text>
                              {skill.masteryScore > 0 && (
                                <View style={styles.masteryRow}>
                                  <Text style={styles.masteryLabel}>Mastery:</Text>
                                  <View style={styles.masteryBarBg}>
                                    <View
                                      style={[
                                        styles.masteryBarFill,
                                        { width: `${Math.min(skill.masteryScore, 100)}%` },
                                      ]}
                                    />
                                  </View>
                                  <Text style={styles.masteryValue}>{Math.round(skill.masteryScore)}%</Text>
                                </View>
                              )}
                              {skill.masteryState && (
                                <Text style={styles.masteryState}>State: {skill.masteryState}</Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          );
        })}
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
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.xs,
  },
  subheader: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.lg,
  },
  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  subjectHeaderPressed: {
    opacity: 0.7,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  subjectInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  subjectName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: 2,
  },
  subjectMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
  skillsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptySkills: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skillItemPressed: {
    opacity: 0.7,
  },
  skillStateIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  skillInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  skillName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: 2,
  },
  skillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  stateLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  skillDifficulty: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
  },
  viewButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.purple,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    marginRight: 2,
  },
  skillDetail: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  skillDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  masteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  masteryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
  masteryBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  masteryBarFill: {
    height: '100%',
    backgroundColor: colors.purple,
    borderRadius: 3,
  },
  masteryValue: {
    fontSize: typography.sizes.xs,
    color: colors.purple,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  masteryState: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
});

export default CurriculumExplorerScreen;
