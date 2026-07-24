import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../../theme';

interface ChildFeedbackOverlayProps {
  message: string;
  category?: 'success' | 'encouragement' | 'retry' | 'completion' | 'countdown';
  isCompleted?: boolean;
}

export const ChildFeedbackOverlay: React.FC<ChildFeedbackOverlayProps> = ({
  message,
  category = 'encouragement',
  isCompleted = false,
}) => {
  if (!message) return null;

  const getCategoryStyles = () => {
    if (isCompleted || category === 'completion') {
      return { bg: colors.green, icon: 'trophy' };
    }
    if (category === 'success') {
      return { bg: colors.purple, icon: 'sparkles' };
    }
    if (category === 'retry') {
      return { bg: colors.coral, icon: 'alert-circle' };
    }
    return { bg: 'rgba(0, 0, 0, 0.75)', icon: 'fitness' };
  };

  const { bg, icon } = getCategoryStyles();

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={24} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
