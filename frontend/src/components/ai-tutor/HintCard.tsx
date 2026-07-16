import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface HintCardProps {
  hints: string[];
  currentHintIndex: number;
  onShowNext: () => void;
  onShowAnswer: () => void;
  showAnswer: boolean;
  answer?: string;
}

export const HintCard: React.FC<HintCardProps> = ({
  hints,
  currentHintIndex,
  onShowNext,
  onShowAnswer,
  showAnswer,
  answer,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const isLastHint = currentHintIndex >= hints.length - 1;

  return (
    <Card
      variant="outlined"
      padding="lg"
      style={[
        styles.card,
        {
          backgroundColor: colors.isDark ? colors.surfaceSecondary : '#FFFDF0',
          borderColor: colors.isDark ? colors.border : '#F5EEC8',
        },
      ]}
      accessibilityLabel="Hint card"
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}20` }]}>
          <Ionicons name="bulb" size={20} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Hints</Text>
        <Text style={[styles.count, { color: colors.textMuted }]}>
          {currentHintIndex + 1}/{hints.length}
        </Text>
      </View>

      <View style={styles.hintsList}>
        {hints.slice(0, currentHintIndex + 1).map((hint, index) => (
          <View
            key={index}
            style={[styles.hintItem, { borderLeftColor: colors.accent }]}
          >
            <Text style={[styles.hintNumber, { color: colors.accent }]}>
              {index + 1}
            </Text>
            <Text style={[styles.hintText, { color: colors.text }]}>{hint}</Text>
          </View>
        ))}
      </View>

      {showAnswer && answer ? (
        <View style={[styles.answerContainer, { backgroundColor: `${colors.success}15`, borderColor: colors.success }]}>
          <View style={styles.answerHeader}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.answerTitle, { color: colors.success }]}>Answer</Text>
          </View>
          <Text style={[styles.answerText, { color: colors.text }]}>{answer}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Show Next Hint"
          variant="outline"
          size="sm"
          disabled={isLastHint}
          onPress={onShowNext}
          leftIcon={<Ionicons name="chevron-forward" size={14} color={isLastHint ? colors.textMuted : colors.primary} />}
          accessibilityLabel="Show next hint"
          style={styles.actionButton}
        />
        {!showAnswer ? (
          <Button
            title="Show Answer"
            variant="ghost"
            size="sm"
            onPress={onShowAnswer}
            leftIcon={<Ionicons name="eye-outline" size={14} color={colors.primary} />}
            accessibilityLabel="Show answer"
            style={styles.actionButton}
          />
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  count: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.families.rounded,
  },
  hintsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  hintNumber: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    marginRight: spacing.sm,
    minWidth: 16,
  },
  hintText: {
    flex: 1,
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.md,
    fontFamily: typography.families.rounded,
  },
  answerContainer: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  answerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  answerText: {
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.md,
    fontFamily: typography.families.rounded,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
