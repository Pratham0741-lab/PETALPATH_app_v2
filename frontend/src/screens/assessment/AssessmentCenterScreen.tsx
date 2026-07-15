import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { useChildStore } from '../../store/childStore';
import { useAssessmentsList, useCreateAttempt } from '../../hooks/useAssessments';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

type Status = 'available' | 'in_progress' | 'completed';

function getAssessmentStatus(
  assessmentId: string,
  attempts: Array<{ assessmentId: string; status: string }> | undefined,
): Status {
  if (!attempts) return 'available';
  const match = attempts.find((a) => a.assessmentId === assessmentId);
  if (!match) return 'available';
  if (match.status === 'COMPLETED') return 'completed';
  if (match.status === 'IN_PROGRESS') return 'in_progress';
  return 'available';
}

function findAttemptId(
  assessmentId: string,
  attempts: Array<{ assessmentId: string; id: string; status: string }> | undefined,
): string | undefined {
  if (!attempts) return undefined;
  const match = attempts.find((a) => a.assessmentId === assessmentId);
  return match?.id;
}

function findCompletedAttemptId(
  assessmentId: string,
  attempts: Array<{ assessmentId: string; id: string; status: string }> | undefined,
): string | undefined {
  if (!attempts) return undefined;
  const match = attempts.find((a) => a.assessmentId === assessmentId && a.status === 'COMPLETED');
  return match?.id;
}

export const AssessmentCenterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((s) => s.activeChild);
  const { assessments, attempts, childId } = useAssessmentsList();
  const createAttempt = useCreateAttempt();
  const [createError, setCreateError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (childId) {
        assessments.refetch();
        attempts.refetch();
      }
    }, [childId]),
  );

  const onRefresh = useCallback(async () => {
    await Promise.all([assessments.refetch(), attempts.refetch()]);
  }, [assessments, attempts]);

  const handleStart = useCallback(
    async (assessmentId: string) => {
      try {
        setCreateError(null);
        const result = await createAttempt.mutateAsync(assessmentId);
        navigation.navigate('AssessmentSession', {
          assessmentId,
          attemptId: result.data.id,
        });
      } catch (err) {
        setCreateError(toUserMessage(err));
      }
    },
    [createAttempt, navigation],
  );

  const handleResume = useCallback(
    (assessmentId: string, attemptId: string) => {
      navigation.navigate('AssessmentSession', { assessmentId, attemptId });
    },
    [navigation],
  );

  const handleViewResults = useCallback(
    (attemptId: string) => {
      navigation.navigate('AssessmentResult', { attemptId });
    },
    [navigation],
  );

  if (!activeChild) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <EmptyState icon="👶" title="Select a child" message="Choose a child profile to view assessments." />
        </View>
      </ScreenContainer>
    );
  }

  if (assessments.isLoading || attempts.isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <LoadingSpinner label="Loading assessments…" />
        </View>
      </ScreenContainer>
    );
  }

  if (assessments.isError || attempts.isError) {
    const error = assessments.isError ? assessments.error : attempts.error;
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load assessments"
            message={toUserMessage(error)}
            onRetry={onRefresh}
          />
        </View>
      </ScreenContainer>
    );
  }

  const assessmentList = assessments.data?.data ?? [];
  const attemptList = attempts.data?.data ?? [];

  if (assessmentList.length === 0) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={assessments.isFetching} onRefresh={onRefresh} tintColor={colors.purple} />}
        >
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="clipboard" size={26} color={colors.purple} />
            </View>
            <Text style={styles.headerTitle}>Assessment Center</Text>
            <Text style={styles.headerSubtitle}>
              Check your child's skills with fun assessments.
            </Text>
          </View>
          <EmptyState
            icon="📋"
            title="No assessments yet"
            message="There are no assessments available right now. Check back later!"
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={assessments.isFetching || attempts.isFetching} onRefresh={onRefresh} tintColor={colors.purple} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="clipboard" size={26} color={colors.purple} />
          </View>
          <Text style={styles.headerTitle}>Assessment Center</Text>
          <Text style={styles.headerSubtitle}>
            Check how {activeChild.name} is progressing.
          </Text>
        </View>

        {createError ? (
          <AppCard style={styles.errorCard}>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={20} color={colors.coral} />
              <Text style={styles.errorText}>{createError}</Text>
            </View>
          </AppCard>
        ) : null}

        {assessmentList.map((assessment: any) => {
          const status = getAssessmentStatus(assessment.id, attemptList);
          const inProgressAttemptId = findAttemptId(assessment.id, attemptList);
          const completedAttemptId = findCompletedAttemptId(assessment.id, attemptList);
          const questionCount = assessment.questions?.length ?? 0;

          return (
            <AppCard key={assessment.id} style={styles.assessmentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="document-text" size={22} color={colors.purple} />
                </View>
                <View style={styles.cardTitleArea}>
                  <Text style={styles.cardTitle}>{assessment.title}</Text>
                  {assessment.description ? (
                    <Text style={styles.cardDescription}>{assessment.description}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.metaText}>
                    {assessment.estimatedMinutes ?? 10} min
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="list-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.metaText}>{questionCount} questions</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {status === 'completed'
                      ? 'Completed'
                      : status === 'in_progress'
                        ? 'In Progress'
                        : 'Available'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                {status === 'completed' && completedAttemptId ? (
                  <AppButton
                    label="View Results"
                    onPress={() => handleViewResults(completedAttemptId)}
                    variant="primary"
                    style={styles.actionBtn}
                  />
                ) : status === 'in_progress' && inProgressAttemptId ? (
                  <AppButton
                    label="Resume"
                    onPress={() => handleResume(assessment.id, inProgressAttemptId)}
                    variant="secondary"
                    style={styles.actionBtn}
                  />
                ) : (
                  <AppButton
                    label="Start Assessment"
                    onPress={() => handleStart(assessment.id)}
                    variant="primary"
                    loading={createAttempt.isPending && createAttempt.variables === assessment.id}
                    style={styles.actionBtn}
                  />
                )}
              </View>
            </AppCard>
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
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  assessmentCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  cardDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  statusBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.purple,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    minWidth: 140,
  },
  errorCard: {
    marginBottom: spacing.md,
    backgroundColor: `${colors.coral}15`,
    borderColor: colors.coral,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
  },
});

export default AssessmentCenterScreen;
