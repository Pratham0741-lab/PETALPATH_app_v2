import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { AppButton } from '../../buttons/AppButton';
import { RewardOverlay } from './RewardOverlay';
import { ConfettiOverlay } from './ConfettiOverlay';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface Props {
  visible: boolean;
  level: number;
  label?: string;
  onClose: () => void;
}

export const LevelUpOverlay: React.FC<Props> = ({ visible, level, label, onClose }) => {
  const scale = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 250, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 150, easing: Easing.inOut(Easing.ease) })
      );
    } else {
      scale.value = 0;
    }
  }, [visible, scale]);

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <RewardOverlay visible={visible}>
      <ConfettiOverlay visible={visible} />
      <AppCard style={styles.card}>
        <Animated.View style={[styles.trophyWrap, trophyStyle]}>
          <Ionicons name="trophy" size={72} color={colors.accent} />
        </Animated.View>
        <Text style={styles.levelText}>Level {level}!</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <AppButton label="Awesome!" variant="primary" onPress={onClose} style={styles.button} />
      </AppCard>
    </RewardOverlay>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.xl,
    width: 280,
  },
  trophyWrap: {
    marginBottom: spacing.md,
  },
  levelText: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    color: colors.text,
    textAlign: 'center',
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
