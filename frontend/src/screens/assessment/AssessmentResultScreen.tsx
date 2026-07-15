import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { ProgressBar, Badge } from '../../components/ui';
import { useAttemptDetail } from '../../hooks/useAssessments';
import { useChildStore } from '../../store/childStore';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

type ResultRouteParams = {
  AssessmentResult: {
    attemptId: string;
  };
};

const formatDate = (iso?: string): string => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const AssessmentResultScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ResultRouteParams, 'AssessmentResult'>>();
  const { attemptId } = route.params;

  const activeChild = useChildStore((s) => s.activeChild);
  const { data, isLoading, isError, error, refetch, isFetching } = useAttemptDetail(attemptId);

  const attempt = data?.data;
  const assessment = attempt?.assessment;
  const questions = assessment?.questions ?? [];
  const sortedQuestions = [...questions].sort((a: any, b: any) => a.order - b.order);

  const onRefresh = useCallback(() => refetch(), [refetch]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <LoadingSpinner label="Loading results…" />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load results"
            message={toUserMessage(error)}
            onRetry={onRefresh}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!attempt) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState title="Result not found" message="This assessment result could not be found." />
        </View>
      </ScreenContainer>
    );
  }

  const percentage = attempt.percentage ?? 0;
  const score = attempt.score ?? 0;
  const maxScore = attempt.maxScore ?? 0;
  const roundedPct = Math.round(percentage);

  const getScoreColor = () => {
    if (roundedPct >= 80) return colors.green;
    if (roundedPct >= 50) return colors.yellow;
    return colors.coral;
  };

  const responses: Array<{ questionId: string; answer: string }> = attempt.rawResponses ?? [];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.purple} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="trophy" size={26} color={colors.yellow} />
          </View>
          <Text style={styles.headerTitle}>Assessment Complete</Text>
          <Text style={styles.headerSubtitle}>
            {activeChild?.name ?? 'Your child'} finished &quot;{assessment?.title ?? 'Assessment'}&quot;
          </Text>
        </View>

        <AppCard style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scorePercentage, { color: getScoreColor() }]}>
              {roundedPct}%
            </Text>
          </View>
          <Text style={styles.scoreDetail}>
            {score} / {maxScore} points
          </Text>
          <ProgressBar progress={roundedPct} color={getScoreColor()} style={styles.scoreBar} />
          <Text style={styles.completedDate}>{formatDate(attempt.completedAt)}</Text>
        </AppCard>

        {sortedQuestions.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Question Review</Text>
            {sortedQuestions.map((question: any, idx: number) => {
              const response = responses.find((r: any) => r.questionId === question.id);
              const userAnswer = response?.answer ?? 'Not answered';
              const isCorrect =
                question.correctAnswer != null
                  ? userAnswer === question.correctAnswer
                  : undefined;

              return (
                <AppCard key={question.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Badge
                      label={`Q${idx + 1}`}
                      color={colors.purple}
                    />
                    {isCorrect === true && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                    )}
                    {isCorrect === false && (
                      <Ionicons name="close-circle" size={20} color={colors.coral} />
                    )}
                  </View>
                  <Text style={styles.reviewPrompt}>{question.prompt}</Text>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Your answer:</Text>
                    <Text style={styles.reviewAnswer}>{userAnswer}</Text>
                  </View>
                  {question.correctAnswer != null && userAnswer !== question.correctAnswer && (
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Correct answer:</Text>
                      <Text style={[styles.reviewAnswer, { color: colors.green }]}>
                        {question.correctAnswer}
                      </Text>
                    </View>
                  )}
                </AppCard>
              );
            })}
          </>
        ) : null}

        <AppButton
          label="Back to Assessments"
          onPress={() => navigation.navigate('AssessmentCenter')}
          variant="primary"
          style={styles.backBtn}
        />
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
  scoreCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.border,
  },
  scorePercentage: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  scoreDetail: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  scoreBar: {
    marginBottom: spacing.md,
    maxWidth: 280,
  },
  completedDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  reviewCard: {
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reviewPrompt: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reviewLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginRight: spacing.sm,
    minWidth: 90,
  },
  reviewAnswer: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
  },
  backBtn: {
    marginTop: spacing.lg,
  },
});

export default AssessmentResultScreen;
