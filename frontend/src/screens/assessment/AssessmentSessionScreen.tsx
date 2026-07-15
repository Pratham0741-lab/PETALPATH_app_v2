import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { ProgressBar } from '../../components/ui';
import { useAttemptDetail, useCreateAttempt, useSubmitAttempt } from '../../hooks/useAssessments';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

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

  const allAnswered = sortedQuestions.every((q: any) => answers[q.id] != null && answers[q.id] !== '');

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

  const renderQuestionInput = (question: any) => {
    const selected = answers[question.id] ?? '';

    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
      case 'BOOLEAN': {
        const options = question.options ?? (question.questionType === 'BOOLEAN'
          ? [{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]
          : []);
        return (
          <View style={styles.optionsContainer}>
            {options.map((opt: any) => {
              const isSelected = selected === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleSelectOption(question.id, opt.value)}
                  style={({ pressed }) => [
                    styles.optionItem,
                    isSelected && styles.optionSelected,
                    { transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      }
      case 'SCALE': {
        const maxScore = question.maxScore ?? 5;
        const scaleOptions = Array.from({ length: maxScore + 1 }, (_, i) => i);
        return (
          <View style={styles.scaleContainer}>
            {scaleOptions.map((val) => {
              const isSelected = selected === String(val);
              return (
                <Pressable
                  key={val}
                  onPress={() => handleSelectOption(question.id, String(val))}
                  style={({ pressed }) => [
                    styles.scaleItem,
                    isSelected && styles.scaleItemSelected,
                    { transform: [{ scale: pressed ? 0.9 : 1 }] },
                  ]}
                >
                  <Text style={[styles.scaleValue, isSelected && styles.scaleValueSelected]}>
                    {val}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      }
      case 'TEXT': {
        return (
          <TextInput
            style={styles.textInput}
            value={selected}
            onChangeText={(val) => handleSelectOption(question.id, val)}
            placeholder="Type your answer here…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        );
      }
      default:
        return <Text style={styles.unsupported}>Unsupported question type.</Text>;
    }
  };

  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.topBarTitle}>
            Question {currentIndex + 1} of {totalQuestions}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <ProgressBar progress={progress} color={colors.purple} style={styles.progressBar} />

        <AppCard style={styles.questionCard}>
          <Text style={styles.questionPrompt}>{currentQuestion.prompt}</Text>

          {renderQuestionInput(currentQuestion)}
        </AppCard>

        <View style={styles.navRow}>
          <AppButton
            label="Previous"
            onPress={handlePrev}
            variant="secondary"
            disabled={currentIndex === 0}
            style={styles.navBtn}
          />
          {isLastQuestion ? (
            <AppButton
              label={showConfirm ? 'Confirm Submit' : 'Submit'}
              onPress={showConfirm ? handleSubmit : handleConfirmSubmit}
              variant="success"
              disabled={!allAnswered}
              loading={isSubmitting}
              style={styles.navBtn}
            />
          ) : (
            <AppButton
              label="Next"
              onPress={handleNext}
              variant="primary"
              disabled={!answers[currentQuestion?.id]}
              style={styles.navBtn}
            />
          )}
        </View>

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
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
  },
  progressBar: {
    marginBottom: spacing.lg,
  },
  questionCard: {
    marginBottom: spacing.lg,
  },
  questionPrompt: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.purple,
    backgroundColor: `${colors.purple}10`,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioSelected: {
    borderColor: colors.purple,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.purple,
  },
  optionLabel: {
    fontSize: typography.sizes.body,
    color: colors.text,
    flex: 1,
  },
  optionLabelSelected: {
    fontWeight: typography.weights.medium,
  },
  scaleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  scaleItem: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  scaleItemSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purple,
  },
  scaleValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  scaleValueSelected: {
    color: '#FFF8ED',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.body,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  unsupported: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  navBtn: {
    flex: 1,
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
