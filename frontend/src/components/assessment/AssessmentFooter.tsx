import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  showShare?: boolean;
  showRestart?: boolean;
  onContinue?: () => void;
  onRestart?: () => void;
  onShare?: () => void;
}

export const AssessmentFooter: React.FC<Props> = ({
  showShare,
  showRestart,
  onContinue,
  onRestart,
  onShare,
}) => {
  return (
    <View style={styles.container}>
      {onContinue ? (
        <Pressable style={styles.primaryBtn} onPress={onContinue}>
          <Text style={styles.primaryText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      ) : null}
      <View style={styles.secondaryRow}>
        {showRestart && onRestart ? (
          <Pressable style={styles.outlineBtn} onPress={onRestart}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.outlineText}>Restart</Text>
          </Pressable>
        ) : null}
        {showShare && onShare ? (
          <Pressable style={styles.outlineBtn} onPress={onShare}>
            <Ionicons name="share-outline" size={18} color={colors.primary} />
            <Text style={styles.outlineText}>Share</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.button,
    gap: spacing.sm,
  },
  primaryText: {
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  outlineText: {
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
});

export default AssessmentFooter;
