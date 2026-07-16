import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { QuestionHeader } from '../../components/assessment/QuestionHeader';
import { AssessmentQuestion } from '../../components/assessment/AssessmentQuestion';
import { QuestionFooter } from '../../components/assessment/QuestionFooter';
import { QuestionProgress } from '../../components/assessment/QuestionProgress';
import { useSubmitPlacementAnswer, useCompletePlacement } from '../../hooks/usePlacement';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

type SessionRouteParams = {
  PlacementAssessmentSession: {
    attemptId: string;
    questions: Array<{
      id: string;
      prompt: string;
      questionType: string;
      options?: Array<{ label: string; value: string }> | null;
      order: number;
      maxScore: number;
    }>;
  };
};

export const PlacementAssessmentSessionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SessionRouteParams, 'PlacementAssessmentSession'>>();
  const { attemptId, questions } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAnswer = useSubmitPlacementAnswer();
  const completePlacement = useCompletePlacement();

  const sortedQuestions = [...questions].sort((a: any, b: any) => a.order - b.order);
  const totalQuestions = sortedQuestions.length;
  const currentQuestion = sortedQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isAnswered = answers[currentQuestion?.id] != null && answers[currentQuestion?.id] !== '';

  const handleSelectOption = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
      setShowConfirm(false);
    }
  }, [currentIndex, totalQuestions]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setShowConfirm(false);
    }
  }, [currentIndex]);

  const handleConfirmSubmit = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!attemptId) return;
    try {
      setError(null);
      await completePlacement.mutateAsync(attemptId);
      navigation.replace('PlacementAssessmentResult', { attemptId });
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [attemptId, completePlacement, navigation]);

  const handleAutoSave = useCallback(async () => {
    if (!attemptId || !currentQuestion) return;
    const answer = answers[currentQuestion.id];
    if (answer == null || answer === '') return;
    try {
      await submitAnswer.mutateAsync({
        attemptId,
        questionId: currentQuestion.id,
        answer,
      });
    } catch {
    }
  }, [attemptId, currentQuestion, answers, submitAnswer]);

  if (!currentQuestion) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState title="No questions found" message="This placement has no questions." />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle}>Placement Assessment</Text>
          <View style={styles.backBtn} />
        </View>

        <QuestionProgress
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          answeredCount={answeredCount}
        />

        {error ? (
          <AppCard style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </AppCard>
        ) : null}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AssessmentQuestion
            question={{
              id: currentQuestion.id,
              prompt: currentQuestion.prompt,
              questionType: currentQuestion.questionType as any,
              options: currentQuestion.options,
              maxScore: currentQuestion.maxScore,
            }}
            answer={answers[currentQuestion.id] ?? ''}
            onAnswer={handleSelectOption}
          />
        </ScrollView>

        <QuestionFooter
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          isAnswered={isAnswered}
          isLastQuestion={isLastQuestion}
          showConfirm={showConfirm}
          isSubmitting={completePlacement.isPending}
          onPrev={handlePrev}
          onNext={() => {
            handleAutoSave();
            handleNext();
          }}
          onSubmit={handleConfirmSubmit}
          onConfirmSubmit={handleSubmit}
        />
      </View>
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
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  errorCard: {
    marginBottom: spacing.md,
    backgroundColor: `${colors.coral}15`,
    borderColor: colors.coral,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
});

export default PlacementAssessmentSessionScreen;
