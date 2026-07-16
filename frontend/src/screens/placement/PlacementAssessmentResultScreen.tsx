import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { ScoreCard } from '../../components/assessment/ScoreCard';
import { StrengthCard } from '../../components/assessment/StrengthCard';
import { WeaknessCard } from '../../components/assessment/WeaknessCard';
import { SkillScoreCard } from '../../components/assessment/SkillScoreCard';
import { RecommendationCard } from '../../components/assessment/RecommendationCard';
import { usePlacementResult, useRestartPlacement } from '../../hooks/usePlacement';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography } from '../../theme';

type ResultRouteParams = {
  PlacementAssessmentResult: {
    attemptId: string;
  };
};

export const PlacementAssessmentResultScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ResultRouteParams, 'PlacementAssessmentResult'>>();
  const { attemptId } = route.params;

  const { data, isLoading, isError, error, refetch } = usePlacementResult(attemptId);
  const restartPlacement = useRestartPlacement();

  const result = data?.data;

  const handleContinue = useCallback(() => {
    navigation.navigate('MainLearning');
  }, [navigation]);

  const handleRestart = useCallback(async () => {
    try {
      await restartPlacement.mutateAsync();
      navigation.replace('PlacementAssessmentIntro');
    } catch {
    }
  }, [restartPlacement, navigation]);

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
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!result) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState title="Result not found" message="This placement result could not be found." />
        </View>
      </ScreenContainer>
    );
  }

  const strengths = result.skillResults.filter((s) => s.accuracy >= 70);
  const weaknesses = result.skillResults.filter((s) => s.accuracy < 70);

  const recommendationItems = result.startingSkill
    ? [{ id: result.startingSkill.id, name: result.startingSkill.name, type: 'curriculum' as const }]
    : [];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="trophy" size={28} color={colors.yellow} />
          </View>
          <Text style={styles.headerTitle}>Placement Complete</Text>
          <Text style={styles.headerSubtitle}>
            We've found the perfect starting point!
          </Text>
        </View>

        <AppCard style={styles.scoreCardContainer}>
          <ScoreCard
            score={result.correctCount}
            maxScore={result.totalQuestions}
            percentage={result.percentage}
          />
        </AppCard>

        {result.startingSkill ? (
          <AppCard style={styles.recommendedCard}>
            <View style={styles.recommendedRow}>
              <Ionicons name="flag" size={22} color={colors.primary} />
              <View style={styles.recommendedTextArea}>
                <Text style={styles.recommendedLabel}>Recommended Starting Level</Text>
                <Text style={styles.recommendedSkill}>{result.startingSkill.name}</Text>
              </View>
            </View>
          </AppCard>
        ) : null}

        {result.skillResults.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Skill Breakdown</Text>
            {result.skillResults.map((skill) => (
              <SkillScoreCard
                key={skill.skillId}
                skillName={skill.skillName}
                correctCount={skill.correctCount}
                totalCount={skill.totalCount}
                accuracy={skill.accuracy}
                mastery={skill.mastery as any}
              />
            ))}
          </>
        ) : null}

        {strengths.length > 0 ? (
          <StrengthCard strengths={strengths.map((s) => ({ skillName: s.skillName, accuracy: s.accuracy }))} />
        ) : null}

        {weaknesses.length > 0 ? (
          <WeaknessCard weaknesses={weaknesses.map((s) => ({ skillName: s.skillName, accuracy: s.accuracy }))} />
        ) : null}

        {recommendationItems.length > 0 ? (
          <RecommendationCard
            title="Recommended Curriculum"
            items={recommendationItems}
          />
        ) : null}

        {result.curriculumGenerated ? (
          <AppCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.green} />
              <Text style={styles.infoText}>
                A personalized curriculum has been generated based on your results.
              </Text>
            </View>
          </AppCard>
        ) : null}

        <AppButton
          label="Continue to Learning"
          onPress={handleContinue}
          variant="primary"
          style={styles.continueBtn}
        />

        <AppButton
          label="Restart Placement"
          onPress={handleRestart}
          variant="secondary"
          loading={restartPlacement.isPending}
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
  scoreCardContainer: {
    marginBottom: spacing.lg,
  },
  recommendedCard: {
    marginBottom: spacing.lg,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  recommendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recommendedTextArea: {
    flex: 1,
  },
  recommendedLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  recommendedSkill: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoCard: {
    marginBottom: spacing.lg,
    backgroundColor: `${colors.green}10`,
    borderColor: colors.green,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    flex: 1,
  },
  continueBtn: {
    marginBottom: spacing.md,
  },
});

export default PlacementAssessmentResultScreen;
