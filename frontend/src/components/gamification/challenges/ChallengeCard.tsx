import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { ProgressBar } from '../../../components/ui';

interface Props {
  title: string;
  description?: string;
  progress: number;
  target: number;
  reward: string;
  category?: string;
  completed: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ChallengeCard: React.FC<Props> = ({
  title,
  description,
  progress,
  target,
  reward,
  category,
  completed,
  onPress,
  style,
}) => {
  const percent = target > 0 ? (progress / target) * 100 : 0;

  const content = (
    <AppCard style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="flag" size={22} color={colors.blue} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {category ? <Text style={styles.category}>{category}</Text> : null}
        </View>
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.progressWrap}>
        <ProgressBar progress={percent} color={colors.blue} />
      </View>
      <View style={styles.footer}>
        <View style={styles.reward}>
          <Ionicons
            name={reward.toLowerCase().includes('star') ? 'star' : 'cash'}
            size={16}
            color={colors.blue}
          />
          <Text style={styles.rewardText}>{reward}</Text>
        </View>
        {completed ? (
          <View style={styles.donePill}>
            <Text style={styles.doneText}>Done</Text>
          </View>
        ) : null}
      </View>
    </AppCard>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : null)}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.blue + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  category: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.blue,
    marginTop: 2,
  },
  description: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  progressWrap: {
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  donePill: {
    backgroundColor: colors.success + '1A',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  doneText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
});
