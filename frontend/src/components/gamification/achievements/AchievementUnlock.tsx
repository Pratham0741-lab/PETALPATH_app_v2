import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { Modal } from '../../../components/ui';
import { AppButton } from '../../buttons/AppButton';

interface AchievementUnlockProps {
  visible: boolean;
  name: string;
  description?: string;
  onClose: () => void;
}

const AchievementUnlock: React.FC<AchievementUnlockProps> = ({
  visible,
  name,
  description,
  onClose,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, scale]);

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
          <Ionicons name="trophy" size={64} color={colors.orange} />
        </Animated.View>
        <Text style={styles.title}>Achievement Unlocked!</Text>
        <Text style={styles.name}>{name}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
        <AppButton
          variant="primary"
          label="Awesome!"
          onPress={onClose}
          style={styles.button}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconWrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.orange,
    textAlign: 'center',
  },
  name: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  description: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  button: {
    marginTop: spacing.lg,
    width: '100%',
  },
});

export default AchievementUnlock;
