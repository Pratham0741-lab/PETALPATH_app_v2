import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { usePlacementQuestionnaire, useStartPlacementFromBeginning } from '../../hooks/usePlacement';
import { useChildStore } from '../../store/childStore';
import { toUserMessage } from '../../api/errors';
import { colors, spacing, typography, radius } from '../../theme';

export const PlacementAssessmentIntroScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((s) => s.activeChild);
  const childId = activeChild?.id;

  const { data, isLoading, isError, error, refetch } = usePlacementQuestionnaire();
  const startPlacementFromBeginning = useStartPlacementFromBeginning();

  const questionnaire = data?.data;
  const hasPreviousAttempt = (questionnaire?.totalQuestions ?? 0) > 0;

  const handleStartFromBeginning = useCallback(async () => {
    if (!childId) return;
    try {
      const result = await startPlacementFromBeginning.mutateAsync();
      if (!result?.data) return;
      navigation.replace('PlacementAssessmentSession', {
        attemptId: result.data.attemptId,
        questions: questionnaire?.questions ?? [],
      });
    } catch {
    }
  }, [childId, startPlacementFromBeginning, navigation, questionnaire]);

  const handleContinuePrevious = useCallback(() => {
    navigation.navigate('PlacementAssessmentSession');
  }, [navigation]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <LoadingSpinner label="Loading placement info…" />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load placement"
            message={toUserMessage(error)}
            onRetry={refetch}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!questionnaire) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="No placement available"
            message="Placement assessment is not configured yet."
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="compass" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Placement Assessment</Text>
          <Text style={styles.description}>
            Discover the perfect starting level for {activeChild?.name ?? 'your child'}. This quick
            assessment will help us recommend the right lessons and modules tailored to their current
            skills.
          </Text>
        </View>

        <AppCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
            <Text style={styles.infoText}>
              Estimated time: {questionnaire.estimatedMinutes} minutes
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="list-outline" size={20} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {questionnaire.totalQuestions} questions
            </Text>
          </View>
        </AppCard>

        <AppButton
          label="Start from Beginning"
          onPress={handleStartFromBeginning}
          variant="primary"
          loading={startPlacementFromBeginning.isPending}
          style={styles.startBtn}
        />

        <AppButton
          label="Continue Previous"
          onPress={handleContinuePrevious}
          variant="secondary"
          disabled={!hasPreviousAttempt}
          style={styles.continueBtn}
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
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    lineHeight: 22,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  startBtn: {
    marginBottom: spacing.md,
  },
  continueBtn: {
    marginBottom: spacing.lg,
  },
});

export default PlacementAssessmentIntroScreen;
