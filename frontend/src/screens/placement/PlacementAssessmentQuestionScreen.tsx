import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppButton } from '../../components/buttons/AppButton';
import { QuestionHeader } from '../../components/assessment/QuestionHeader';
import { AssessmentQuestion } from '../../components/assessment/AssessmentQuestion';
import { useSubmitPlacementAnswer, useCompletePlacement } from '../../hooks/usePlacement';
import { colors, spacing, typography } from '../../theme';

type QuestionRouteParams = {
  PlacementAssessmentQuestion: {
    attemptId: string;
    question: {
      id: string;
      prompt: string;
      questionType: string;
      options?: Array<{ label: string; value: string }> | null;
      order: number;
      maxScore: number;
    };
    questionNumber: number;
    totalQuestions: number;
    isLastQuestion: boolean;
  };
};

export const PlacementAssessmentQuestionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<QuestionRouteParams, 'PlacementAssessmentQuestion'>>();
  const { attemptId, question, questionNumber, totalQuestions, isLastQuestion } = route.params;

  const [answer, setAnswer] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const submitAnswer = useSubmitPlacementAnswer();
  const completePlacement = useCompletePlacement();

  const handleAnswer = useCallback((_questionId: string, value: string) => {
    setAnswer(value);
  }, []);

  const handleSaveAndNext = useCallback(async () => {
    try {
      await submitAnswer.mutateAsync({ attemptId, questionId: question.id, answer });
    } catch {
    }
    navigation.goBack();
  }, [attemptId, question, answer, submitAnswer, navigation]);

  const handleConfirmSubmit = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await submitAnswer.mutateAsync({ attemptId, questionId: question.id, answer });
      await completePlacement.mutateAsync(attemptId);
      navigation.replace('PlacementAssessmentResult', { attemptId });
    } catch {
    }
  }, [attemptId, question, answer, submitAnswer, completePlacement, navigation]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle}>
            Question {questionNumber} of {totalQuestions}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AssessmentQuestion
            question={{
              id: question.id,
              prompt: question.prompt,
              questionType: question.questionType as any,
              options: question.options,
              maxScore: question.maxScore,
            }}
            answer={answer}
            onAnswer={handleAnswer}
          />
        </ScrollView>

        <View style={styles.footer}>
          {isLastQuestion ? (
            <AppButton
              label={showConfirm ? 'Confirm Submit' : 'Submit'}
              onPress={showConfirm ? handleSubmit : handleConfirmSubmit}
              variant="success"
              disabled={!answer}
              loading={completePlacement.isPending}
            />
          ) : (
            <AppButton
              label="Save & Next"
              onPress={handleSaveAndNext}
              variant="primary"
              disabled={!answer}
              loading={submitAnswer.isPending}
            />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  footer: {
    paddingVertical: spacing.md,
  },
});

export default PlacementAssessmentQuestionScreen;
