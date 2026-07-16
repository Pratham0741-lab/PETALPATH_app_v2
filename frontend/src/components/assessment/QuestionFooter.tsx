import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { AppButton } from '../buttons/AppButton';

interface Props {
  currentIndex: number;
  totalQuestions: number;
  isAnswered: boolean;
  isLastQuestion: boolean;
  showConfirm: boolean;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onConfirmSubmit: () => void;
}

export const QuestionFooter: React.FC<Props> = ({
  currentIndex,
  totalQuestions,
  isAnswered,
  isLastQuestion,
  showConfirm,
  isSubmitting,
  onPrev,
  onNext,
  onSubmit,
  onConfirmSubmit,
}) => {
  const rightButton = () => {
    if (showConfirm) {
      return (
        <AppButton
          label="Confirm Submit"
          onPress={onConfirmSubmit}
          variant="danger"
          disabled={isSubmitting}
          loading={isSubmitting}
          style={styles.rightButton}
        />
      );
    }
    if (isLastQuestion) {
      return (
        <AppButton
          label="Submit"
          onPress={onSubmit}
          variant="success"
          disabled={!isAnswered || isSubmitting}
          loading={isSubmitting}
          style={styles.rightButton}
        />
      );
    }
    return (
      <AppButton
        label="Next"
        onPress={onNext}
        variant="primary"
        disabled={!isAnswered}
        style={styles.rightButton}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSlot}>
        {currentIndex > 0 && (
          <AppButton
            label="Previous"
            onPress={onPrev}
            variant="secondary"
            style={styles.leftButton}
          />
        )}
      </View>
      {rightButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  leftSlot: {
    flex: 1,
    alignItems: 'flex-start',
  },
  leftButton: {
    minWidth: 120,
  },
  rightButton: {
    minWidth: 120,
  },
});

export default QuestionFooter;
