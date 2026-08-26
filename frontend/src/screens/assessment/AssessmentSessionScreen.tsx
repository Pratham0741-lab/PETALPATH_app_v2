import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { AssessmentProgressBar } from '../../components/assessment/AssessmentProgressBar';
import { QuestionHeader } from '../../components/assessment/QuestionHeader';
import { AssessmentQuestion } from '../../components/assessment/AssessmentQuestion';
import { QuestionFooter } from '../../components/assessment/QuestionFooter';
import { useAttemptDetail, useCreateAttempt, useSubmitAttempt } from '../../hooks/useAssessments';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography } from '../../theme';

type SessionRouteParams = {
  AssessmentSession: {
    assessmentId: string;
    attemptId?: string;
  };
};

export const AssessmentSessionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SessionRouteParams, 'AssessmentSession'>>();
  const { assessmentId, attemptId: existingAttemptId } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [localAttemptId, setLocalAttemptId] = useState<string | undefined>(existingAttemptId);
  const [showConfirm, setShowConfirm] = useState(false);

  const createAttempt = useCreateAttempt();
  const submitAttempt = useSubmitAttempt();
  const { data: attemptData, isLoading: attemptLoading, isError: attemptError, error: attemptErr, refetch: refetchAttempt } = useAttemptDetail(localAttemptId!);

  const attempt = attemptData?.data;
  const questions = attempt?.assessment?.questions ?? [];
  const sortedQuestions = [...questions].sort((a: any, b: any) => a.order - b.order);
  const totalQuestions = sortedQuestions.length;
  const currentQuestion = sortedQuestions[currentIndex];
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isSubmitting = submitAttempt.isPending;
  const isStarting = createAttempt.isPending;

  const answeredCount = sortedQuestions.filter((q: any) => answers[q.id] != null && answers[q.id] !== '').length;

  useEffect(() => {
    if (!localAttemptId && !createAttempt.isPending && !createAttempt.isError) {
      createAttempt.mutate(assessmentId, {
        onSuccess: (result) => {
          setLocalAttemptId(result.data.id);
        },
      });
    }
  }, [localAttemptId, assessmentId]);

  useEffect(() => {
    if (attempt?.status === 'COMPLETED') {
      navigation.replace('AssessmentResult', { attemptId: localAttemptId });
    }
  }, [attempt?.status, localAttemptId, navigation]);

  const handleSelectOption = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, totalQuestions]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleConfirmSubmit = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!localAttemptId) return;
    const responses = sortedQuestions.map((q: any) => ({
      questionId: q.id,
      answer: answers[q.id] ?? '',
    }));
    try {
      await submitAttempt.mutateAsync({ attemptId: localAttemptId, responses });
      navigation.replace('AssessmentResult', { attemptId: localAttemptId });
    } catch {
      // Error shown inline
    }
  }, [localAttemptId, sortedQuestions, answers, submitAttempt, navigation]);

  const handleSubmitPress = useCallback(() => {
    handleConfirmSubmit();
  }, [handleConfirmSubmit]);

  const isAnswered = currentQuestion ? answers[currentQuestion.id] != null && answers[currentQuestion.id] !== '' : false;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  if (isStarting || (attemptLoading && localAttemptId)) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <LoadingSpinner label={isStarting ? 'Starting assessment…' : 'Loading questions…'} />
        </View>
      </ScreenContainer>
    );
  }

  if (attemptError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load assessment"
            message={toUserMessage(attemptErr)}
            onRetry={refetchAttempt}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState title="No questions found" message="This assessment has no questions." />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <AssessmentProgressBar
          progress={progress}
          answeredCount={answeredCount}
          totalCount={totalQuestions}
          color={colors.primary}
        />

        <QuestionHeader
          questionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
          prompt={currentQuestion.prompt}
        />

        <AssessmentQuestion
          question={{
            id: currentQuestion.id,
            prompt: currentQuestion.prompt,
            questionType: currentQuestion.questionType,
            options: currentQuestion.options ?? null,
            maxScore: currentQuestion.maxScore ?? 5,
          }}
          answer={answers[currentQuestion.id] ?? ''}
          onAnswer={handleSelectOption}
        />

        <QuestionFooter
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          isAnswered={isAnswered}
          isLastQuestion={isLastQuestion}
          showConfirm={showConfirm}
          isSubmitting={isSubmitting}
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmit={handleSubmitPress}
          onConfirmSubmit={handleSubmit}
        />

        {showConfirm && !isSubmitting && (
          <AppCard style={styles.confirmCard}>
            <Text style={styles.confirmText}>
              You are about to submit your answers. This action cannot be undone.
            </Text>
          </AppCard>
        )}
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
  confirmCard: {
    backgroundColor: `${colors.yellow}20`,
    borderColor: colors.yellow,
  },
  confirmText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AssessmentSessionScreen;
