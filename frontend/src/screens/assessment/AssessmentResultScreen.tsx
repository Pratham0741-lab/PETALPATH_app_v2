import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { AssessmentResultHeader } from '../../components/assessment/AssessmentResultHeader';
import { ScoreCard } from '../../components/assessment/ScoreCard';
import { SkillScoreCard } from '../../components/assessment/SkillScoreCard';
import { StrengthCard } from '../../components/assessment/StrengthCard';
import { WeaknessCard } from '../../components/assessment/WeaknessCard';
import { RecommendationCard } from '../../components/assessment/RecommendationCard';
import { AssessmentFooter } from '../../components/assessment/AssessmentFooter';
import { useAttemptDetail } from '../../hooks/useAssessments';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography } from '../../theme';

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

  const { data, isLoading, isError, error, refetch, isFetching } = useAttemptDetail(attemptId);

  const attempt = data?.data;
  const assessment = attempt?.assessment;
  const skillScores = attempt?.skillScores as Array<{ skillName: string; correctCount: number; totalCount: number; accuracy: number; mastery: 'beginner' | 'developing' | 'proficient' | 'advanced' | 'mastered' }> | undefined;
  const recommendations = attempt?.recommendations as Array<{ id: string; name: string; type: 'curriculum' | 'module' | 'lesson' | 'reinforcement' }> | undefined;

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const handleContinue = useCallback(() => {
    navigation.navigate('AssessmentCenter');
  }, [navigation]);

  const handleRestart = useCallback(() => {
    navigation.navigate('AssessmentSession', { assessmentId: assessment?.id, attemptId: undefined });
  }, [navigation, assessment?.id]);

  const strengths = skillScores?.filter((s) => s.accuracy >= 70) ?? [];
  const weaknesses = skillScores?.filter((s) => s.accuracy < 70) ?? [];

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

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <AssessmentResultHeader
          title={assessment?.title ?? 'Assessment Complete'}
          percentage={percentage}
          score={score}
          maxScore={maxScore}
          completedAt={formatDate(attempt.completedAt)}
        />

        <ScoreCard
          score={score}
          maxScore={maxScore}
          percentage={percentage}
        />

        {skillScores?.map((skill) => (
          <SkillScoreCard
            key={skill.skillName}
            skillName={skill.skillName}
            correctCount={skill.correctCount}
            totalCount={skill.totalCount}
            accuracy={skill.accuracy}
            mastery={skill.mastery}
          />
        ))}

        {strengths.length > 0 && <StrengthCard strengths={strengths} />}

        {weaknesses.length > 0 && <WeaknessCard weaknesses={weaknesses} />}

        {recommendations && recommendations.length > 0 && (
          <RecommendationCard
            title="Recommendations"
            items={recommendations}
          />
        )}

        <AssessmentFooter
          onContinue={handleContinue}
          showRestart
          onRestart={handleRestart}
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
});

export default AssessmentResultScreen;
