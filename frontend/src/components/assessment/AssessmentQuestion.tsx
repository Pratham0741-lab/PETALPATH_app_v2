import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';
import { ChoiceOption } from './ChoiceOption';
import { MatchingGrid } from './MatchingGrid';
import { OrderingList } from './OrderingList';
import { AnswerInput } from './AnswerInput';
import { QuestionHeader } from './QuestionHeader';

interface Props {
  question: {
    id: string;
    prompt: string;
    questionType: 'MULTIPLE_CHOICE' | 'BOOLEAN' | 'SCALE' | 'TEXT' | 'MULTI_SELECT' | 'ORDERING' | 'MATCHING' | 'FILL_BLANK';
    options?: Array<{ label: string; value: string }> | null;
    maxScore: number;
  };
  answer: string;
  onAnswer: (questionId: string, value: string) => void;
  isReview?: boolean;
  correctAnswer?: string | null;
}

const SINGLE_CHOICE_TYPES = new Set(['MULTIPLE_CHOICE', 'BOOLEAN', 'MULTI_SELECT']);

export const AssessmentQuestion: React.FC<Props> = ({
  question,
  answer,
  onAnswer,
  isReview,
  correctAnswer,
}) => {
  const renderQuestion = () => {
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
      case 'BOOLEAN':
      case 'MULTI_SELECT':
        return (
          <ChoiceOption
            questionType={question.questionType}
            options={question.options ?? []}
            selectedValue={answer}
            onSelect={(value) => onAnswer(question.id, value)}
            isReview={isReview}
            correctAnswer={correctAnswer}
          />
        );
      case 'MATCHING':
        return (
          <MatchingGrid
            options={question.options ?? null}
            selectedValue={answer}
            onSelect={(value) => onAnswer(question.id, value)}
            isReview={isReview}
            correctAnswer={correctAnswer}
          />
        );
      case 'ORDERING':
        return (
          <OrderingList
            options={question.options ?? null}
            selectedValue={answer}
            onSelect={(value) => onAnswer(question.id, value)}
            isReview={isReview}
            correctAnswer={correctAnswer}
          />
        );
      case 'TEXT':
      case 'FILL_BLANK':
        return (
          <AnswerInput
            questionType={question.questionType}
            value={answer}
            onChange={(value) => onAnswer(question.id, value)}
            isReview={isReview}
            correctAnswer={correctAnswer}
          />
        );
      case 'SCALE':
        return (
          <View style={styles.unsupported}>
            <Text style={styles.unsupportedText}>Unsupported question type.</Text>
          </View>
        );
      default:
        return (
          <View style={styles.unsupported}>
            <Text style={styles.unsupportedText}>Unsupported question type.</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.card}>
      <QuestionHeader
        questionNumber={0}
        totalQuestions={0}
        prompt={question.prompt}
      />
      {renderQuestion()}
      {isReview && correctAnswer !== undefined && correctAnswer !== null && (
        <View style={[styles.reviewBanner, answer === correctAnswer ? styles.correctBanner : styles.wrongBanner]}>
          <Text style={styles.reviewIcon}>{answer === correctAnswer ? '✓' : '✗'}</Text>
          <Text style={styles.reviewText}>
            {answer === correctAnswer ? 'Correct' : `Correct answer: ${correctAnswer}`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  unsupported: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  unsupportedText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.families.rounded,
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  correctBanner: {
    backgroundColor: colors.successLight,
  },
  wrongBanner: {
    backgroundColor: colors.errorLight,
  },
  reviewIcon: {
    fontSize: typography.sizes.body,
    marginRight: spacing.xs,
  },
  reviewText: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
});

export default AssessmentQuestion;
