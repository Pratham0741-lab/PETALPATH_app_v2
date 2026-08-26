import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../../../components/ui';
import { AppButton } from '../../buttons/AppButton';

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  label?: string;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  visible,
  level,
  label,
  onClose,
}) => {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }).start();
    } else {
      scale.setValue(0);
    }
  }, [visible, scale]);

  return (
    <Modal visible={visible} onClose={onClose} title="Level Up!">
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
          <Ionicons name="trophy" size={64} color={colors.primary} />
        </Animated.View>
        <Text style={styles.title}>You reached Level {level}!</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <AppButton variant="primary" onPress={onClose} label="Awesome!" style={styles.button} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    fontFamily: typography.families.rounded,
    color: colors.text,
    textAlign: 'center',
  },
  label: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
  },
});
