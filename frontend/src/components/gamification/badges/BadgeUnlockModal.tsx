import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { Modal } from '../../../components/ui';
import { AppButton } from '../../../components/buttons/AppButton';

interface BadgeUnlockModalProps {
  visible: boolean;
  name: string;
  description?: string | null;
  imagePath?: string | null;
  onClose: () => void;
}

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({
  visible,
  name,
  description,
  imagePath,
  onClose,
}) => {
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.5);
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scale]);

  return (
    <Modal visible={visible} onClose={onClose} title="Badge Unlocked!">
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
          {imagePath ? (
            <Image source={{ uri: imagePath }} style={styles.image} />
          ) : (
            <Ionicons name="medal" size={44} color={colors.purple} />
          )}
        </Animated.View>
        <Text style={styles.name}>{name}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
        <View style={styles.buttonWrap}>
          <AppButton label="Awesome!" onPress={onClose} variant="primary" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.lavender,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonWrap: {
    width: '100%',
    marginTop: spacing.md,
  },
});
