import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfettiEffect } from './ConfettiEffect';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { CompletionResult } from './types';

interface CompletionScreenProps {
  visible: boolean;
  result: CompletionResult | null;
  onContinue: () => void;
  onViewRewards?: () => void;
}

export const ActivityCompletionScreen: React.FC<CompletionScreenProps> = ({
  visible,
  result,
  onContinue,
  onViewRewards,
}) => {
  const reduceMotion = useReducedMotion();

  if (!visible || !result) return null;

  const score = result.score ?? 0;
  const stars = result.stars ?? 0;
  const isPerfect = score >= 100;

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(300)}
      exiting={reduceMotion ? undefined : FadeOut.duration(200)}
      style={styles.overlay}
    >
      <ConfettiEffect visible={isPerfect} />
      <View style={styles.container}>
        <View style={styles.starCircle}>
          <Ionicons
            name={isPerfect ? 'star' : 'checkmark-circle'}
            size={64}
            color={isPerfect ? colors.yellow : colors.green}
          />
        </View>

        <Text style={styles.title}>Activity Complete!</Text>

        {score > 0 && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{score}%</Text>
          </View>
        )}

        {stars > 0 && (
          <View style={styles.starsRow}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Ionicons
                key={i}
                name="star"
                size={32}
                color={i < stars ? colors.yellow : colors.border}
              />
            ))}
          </View>
        )}

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
          </View>
          {stars > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Stars Earned</Text>
              <Text style={styles.summaryValue}>{stars}/3</Text>
            </View>
          )}
        </Card>

        <Button
          label="Continue"
          variant="primary"
          onPress={onContinue}
          fullWidth
          size="lg"
        />

        {onViewRewards && (
          <Button
            label="View Rewards"
            variant="ghost"
            onPress={onViewRewards}
            fullWidth
          />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.lg,
  },
  starCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.yellow}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  scoreRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  scoreValue: {
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    width: '100%',
    gap: spacing.sm,
  },
  summaryTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
});
