import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { ProgressBar } from '../../components/progress/ProgressBar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useCurriculum, useActivateSkill } from '../../hooks/useCurriculum';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

const stateConfig: Record<string, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  LOCKED: { label: 'Locked', icon: 'lock-closed', color: colors.textMuted },
  AVAILABLE: { label: 'Available', icon: 'lock-open', color: colors.blue },
  ACTIVE: { label: 'Active', icon: 'flame', color: colors.coral },
  COMPLETED: { label: 'Completed', icon: 'checkmark-circle', color: colors.green },
};

const SkillDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
      <ScreenContainer>
        <TopBar title="Skill Detail" showBack />
        <View style={styles.center}>
          <LoadingSpinner label="Loading skill…" />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <TopBar title="Skill Detail" showBack />
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load skill"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!skillData) {
    return (
      <ScreenContainer>
        <TopBar title="Skill Detail" showBack />
        <View style={styles.center}>
          <EmptyState
            icon="🔍"
            title="Skill not found"
            message="This skill could not be found in the curriculum."
          />
        </View>
      </ScreenContainer>
    );
  }

  const { skill, subjectName } = skillData;
  const cfg = stateConfig[skill.state] ?? stateConfig.LOCKED;
  const isActivating = activateSkill.isPending;
  const canActivate = skill.state === 'AVAILABLE';

  return (
    <ScreenContainer>
      <TopBar title={skill.name} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={[styles.stateIconCircle, { backgroundColor: cfg.color + '18' }]}>
              <Ionicons name={cfg.icon} size={28} color={cfg.color} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.skillTitle}>{skill.name}</Text>
              <Text style={styles.subjectLabel}>{subjectName}</Text>
            </View>
          </View>

          <View style={[styles.stateBadgeLarge, { backgroundColor: cfg.color + '15' }]}>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[styles.stateBadgeLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </AppCard>

        {skill.description && (
          <AppCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{skill.description}</Text>
          </AppCard>
        )}

        <AppCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{skill.difficulty > 0 ? `Lv.${skill.difficulty}` : 'N/A'}</Text>
              <Text style={styles.statLabel}>Difficulty</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{skill.masteryState ?? '—'}</Text>
              <Text style={styles.statLabel}>Mastery State</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{skill.estimatedAge ? `${skill.estimatedAge}+` : '—'}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
          </View>
          {(skill.masteryScore ?? 0) > 0 && (
            <View style={styles.masterySection}>
              <View style={styles.masteryLabelRow}>
                <Text style={styles.masteryLabel}>Mastery Score</Text>
                <Text style={styles.masteryValue}>{Math.round(skill.masteryScore)}%</Text>
              </View>
              <ProgressBar progress={skill.masteryScore / 100} color={colors.purple} height={10} />
            </View>
          )}
        </AppCard>

        <View style={styles.actions}>
          {canActivate && (
            <AppButton
              label="Activate Skill"
              onPress={handleActivate}
              variant="primary"
              loading={isActivating}
              style={styles.actionButton}
            />
          )}
          <AppButton
            label="Go to Journey"
            onPress={handleGoToJourney}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
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
    gap: spacing.md,
  },
  headerCard: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  skillTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: 2,
  },
  subjectLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
  stateBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  stateBadgeLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  descriptionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    lineHeight: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xs,
  },
  masterySection: {
    gap: spacing.sm,
  },
  masteryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masteryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  masteryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.purple,
    fontFamily: typography.families.rounded,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});

export default SkillDetailScreen;
