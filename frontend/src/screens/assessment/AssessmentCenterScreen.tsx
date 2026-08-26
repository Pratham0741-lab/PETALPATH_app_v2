import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, SectionList, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { AssessmentCard } from '../../components/assessment/AssessmentCard';
import { useChildStore } from '../../store/childStore';
import { useAssessmentsList, useCreateAttempt } from '../../hooks/useAssessments';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography } from '../../theme';

type Status = 'not_started' | 'in_progress' | 'completed';

function getAssessmentStatus(
  assessmentId: string,
  attempts: Array<{ assessmentId: string; status: string }> | undefined,
): Status {
  if (!attempts) return 'not_started';
  const match = attempts.find((a) => a.assessmentId === assessmentId);
  if (!match) return 'not_started';
  if (match.status === 'COMPLETED') return 'completed';
  if (match.status === 'IN_PROGRESS') return 'in_progress';
  return 'not_started';
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

interface SectionItem {
  assessment: Record<string, any>;
  status: Status;
  attemptId?: string;
}

interface Section {
  title: string;
  data: SectionItem[];
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

  const handleAssessmentPress = useCallback(
    (assessment: Record<string, any>, status: Status, attemptId?: string) => {
      if (status === 'completed' && attemptId) {
        handleViewResults(attemptId);
      } else if (status === 'in_progress' && attemptId) {
        handleResume(assessment.id, attemptId);
      } else {
        handleStart(assessment.id);
      }
    },
    [handleStart, handleResume, handleViewResults],
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
        <View style={styles.center}>
          <EmptyState
            icon="📋"
            title="No assessments available"
            message="There are no assessments available right now. Check back later!"
          />
        </View>
      </ScreenContainer>
    );
  }

  const sectionsMap: Record<string, SectionItem[]> = {
    'Available': [],
    'In Progress': [],
    'Completed': [],
  };

  assessmentList.forEach((assessment: Record<string, any>) => {
    const status = getAssessmentStatus(assessment.id, attemptList);
    const attemptId = status === 'completed'
      ? findCompletedAttemptId(assessment.id, attemptList)
      : findAttemptId(assessment.id, attemptList);
    const sectionKey = status === 'not_started' ? 'Available' : status === 'in_progress' ? 'In Progress' : 'Completed';
    sectionsMap[sectionKey].push({ assessment, status, attemptId });
  });

  const sections: Section[] = Object.entries(sectionsMap)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));

  return (
    <ScreenContainer>
      <SectionList
        sections={sections}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={assessments.isFetching || attempts.isFetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="clipboard" size={26} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Assessment Center</Text>
              <Text style={styles.headerSubtitle}>
                Check how {activeChild.name} is progressing.
              </Text>
            </View>
            {createError ? (
              <View style={styles.errorCard}>
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={20} color={colors.coral} />
                  <Text style={styles.errorText}>{createError}</Text>
                </View>
              </View>
            ) : null}
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item: { assessment, status, attemptId } }) => (
          <AssessmentCard
            title={assessment.title}
            description={assessment.description}
            estimatedMinutes={assessment.estimatedMinutes ?? 10}
            questionCount={assessment.questions?.length ?? 0}
            status={status}
            onPress={() => handleAssessmentPress(assessment, status, attemptId)}
          />
        )}
        keyExtractor={(item) => item.assessment.id}
      />
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
    borderRadius: 24,
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
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${colors.coral}15`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.coral,
    marginBottom: spacing.md,
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
