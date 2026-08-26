/**
 * ChallengeCard — one daily challenge.
 *
 * Redesign notes (§5, §7, §15): challenges are the blue activity family, so the
 * card uses the `blueSoft`/`blueDark` tint pair from the tokens rather than
 * `colors.blue + '1A'` string concatenation, and the Ionicons flag/star/cash
 * glyphs are the `sparkle`, `star` and `coin` PetalIcons.
 *
 * Two things were also wrong underneath the styling. The card wrapped an
 * `AppCard` inside a `Pressable`, which nests a pressable in a pressable and
 * loses the press animation the rest of the app has — it is a single `Card` with
 * `onPress` now. And the "Done" pill drew `colors.success` on a 10%-alpha green,
 * roughly 2:1, so the one word confirming the child finished the challenge was
 * the least readable thing on the card (§30). It now carries a check glyph as
 * well, so completion is not signalled by colour alone.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import { Card, IconWell, ProgressIndicator } from '../../design';
import { PetalIcon } from '../../icons';

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
  const rewardIcon = reward.toLowerCase().includes('star') ? 'star' : 'coin';

  return (
    <Card
      variant={completed ? 'selected' : 'raised'}
      onPress={onPress}
      style={style}
      accessibilityLabel={`${title}. ${
        completed ? 'Completed' : `${progress} of ${target}`
      }. Reward: ${reward}`}
    >
      <View style={styles.header}>
        <IconWell
          icon={completed ? 'check' : 'sparkle'}
          color={completed ? colors.successDark : colors.blueDark}
          soft={completed ? colors.greenSoft : colors.blueSoft}
          size={44}
          filled={completed}
        />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {category ? (
            <Text style={styles.category} numberOfLines={1}>
              {category}
            </Text>
          ) : null}
        </View>
      </View>

      {description ? <Text style={styles.description}>{description}</Text> : null}

      <ProgressIndicator
        value={percent}
        color={completed ? colors.success : colors.blue}
        countOf={{ current: progress, total: target }}
        style={styles.progressWrap}
      />

      <View style={styles.footer}>
        <View style={styles.reward}>
          <PetalIcon name={rewardIcon} size={16} color={colors.accent} filled />
          <Text style={styles.rewardText}>{reward}</Text>
        </View>
        {completed ? (
          <View style={styles.donePill}>
            <PetalIcon name="check" size={12} color={colors.successDark} strokeWidth={2.4} />
            <Text style={styles.doneText}>Done</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.presets.cardTitle,
    color: colors.text,
  },
  category: {
    ...typography.presets.caption,
    color: colors.blueDark,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  description: {
    ...typography.presets.subtle,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  progressWrap: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  rewardText: {
    ...typography.presets.subtle,
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenSoft,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  doneText: {
    ...typography.presets.caption,
    color: colors.successDark,
    fontWeight: typography.weights.bold,
  },
});

export default ChallengeCard;
