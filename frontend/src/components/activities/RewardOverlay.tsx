import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Button } from '../ui/Button';
import { ConfettiEffect } from './ConfettiEffect';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { RewardData } from './types';

interface RewardOverlayProps {
  visible: boolean;
  reward: RewardData | null;
  onDismiss: () => void;
}

const StarBurst: React.FC<{ delay: number }> = ({ delay }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => {
      scale.value = withSequence(
        withTiming(1.3, { duration: 300, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(1, { duration: 200 }),
      );
      opacity.value = withTiming(1, { duration: 200 });
    }, delay);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="star" size={40} color={colors.yellow} />
    </Animated.View>
  );
};

export const RewardOverlay: React.FC<RewardOverlayProps> = ({ visible, reward, onDismiss }) => {
  const reduceMotion = useReducedMotion();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (visible && reward) {
      const hasReward = reward.xpGained > 0 || reward.newBadges.length > 0 || reward.levelUp;
      if (hasReward) {
        setShowConfetti(true);
      }
    }
  }, [visible, reward]);

  if (!visible || !reward) return null;

  const xpBarWidth = Math.min((reward.xpGained / 100) * 100, 100);

  return (
    <Modal transparent visible={visible} animationType={reduceMotion ? 'none' : 'fade'}>
      <View style={styles.overlay}>
        <ConfettiEffect visible={showConfetti} />
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(300)}
          exiting={reduceMotion ? undefined : FadeOut.duration(200)}
          style={styles.container}
        >
          <Animated.View
            entering={reduceMotion ? undefined : SlideInDown.duration(400).springify()}
            style={styles.card}
          >
            <View style={styles.starRow}>
              {reward.xpGained > 0 && reward.xpGained >= 5 && <StarBurst delay={0} />}
              {reward.xpGained > 0 && reward.xpGained >= 10 && <StarBurst delay={150} />}
              {reward.xpGained > 0 && reward.xpGained >= 20 && <StarBurst delay={300} />}
            </View>

            <Text style={styles.title}>Great Job!</Text>

            {reward.xpGained > 0 && (
              <View style={styles.xpSection}>
                <View style={styles.xpRow}>
                  <Ionicons name="flash" size={20} color={colors.yellow} />
                  <Text style={styles.xpText}>+{reward.xpGained} XP</Text>
                </View>
                <View style={styles.xpBarBg}>
                  <View style={[styles.xpBarFill, { width: `${xpBarWidth}%` }]} />
                </View>
              </View>
            )}

            {reward.coinsEarned > 0 && (
              <View style={styles.rewardRow}>
                <Ionicons name="cash" size={18} color={colors.yellow} />
                <Text style={styles.rewardText}>+{reward.coinsEarned} coins</Text>
              </View>
            )}

            {reward.starsEarned > 0 && (
              <View style={styles.rewardRow}>
                <Ionicons name="star" size={18} color={colors.yellow} />
                <Text style={styles.rewardText}>{reward.starsEarned} stars</Text>
              </View>
            )}

            {reward.newBadges.length > 0 && (
              <View style={styles.badgeSection}>
                <Text style={styles.sectionLabel}>New Badges!</Text>
                <View style={styles.badgeRow}>
                  {reward.newBadges.map((badge) => (
                    <View key={badge.id} style={styles.badgeItem}>
                      <Ionicons name="trophy" size={28} color={colors.yellow} />
                      <Text style={styles.badgeName} numberOfLines={2}>
                        {badge.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {reward.masteryIncrease > 0 && (
              <View style={styles.rewardRow}>
                <Ionicons name="trending-up" size={18} color={colors.green} />
                <Text style={[styles.rewardText, { color: colors.green }]}>
                  Mastery +{reward.masteryIncrease}%
                </Text>
              </View>
            )}

            {reward.levelUp && (
              <View style={styles.levelUpSection}>
                <Ionicons name="trophy" size={32} color={colors.yellow} />
                <Text style={styles.levelUpText}>Level Up! Level {reward.newLevel ?? '??'}</Text>
              </View>
            )}

            {reward.unlockedLessons.length > 0 && (
              <View style={styles.unlockSection}>
                <Ionicons name="lock-open" size={16} color={colors.green} />
                <Text style={styles.unlockText}>New lessons unlocked!</Text>
              </View>
            )}

            <Button
              label="Continue"
              variant="primary"
              onPress={onDismiss}
              fullWidth
              size="lg"
              style={styles.continueBtn}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.lg,
  },
  starRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  xpSection: {
    width: '100%',
    gap: spacing.xs,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  xpText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.yellow,
    fontFamily: typography.families.rounded,
  },
  xpBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: radius.full,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rewardText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontFamily: typography.families.rounded,
  },
  badgeSection: {
    width: '100%',
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.families.rounded,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  badgeItem: {
    alignItems: 'center',
    gap: spacing.xs,
    /* Badge names run long ("Curious Explorer"). The row wraps, so capping each
       item lets a long name break onto a second line instead of stretching the
       item past the overlay's edge. */
    maxWidth: 104,
  },
  badgeName: {
    fontSize: typography.sizes.caption,
    color: colors.text,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    flexShrink: 1,
  },
  levelUpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.yellow}15`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  levelUpText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.yellow,
    fontFamily: typography.families.rounded,
  },
  unlockSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unlockText: {
    fontSize: typography.sizes.sm,
    color: colors.green,
    fontFamily: typography.families.rounded,
  },
  continueBtn: {
    marginTop: spacing.sm,
  },
});
