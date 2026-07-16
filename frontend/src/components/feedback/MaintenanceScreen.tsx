import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedCompletion?: string;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  title = 'Under Maintenance',
  message = 'We are currently performing scheduled maintenance to improve your experience.',
  estimatedCompletion,
}) => {
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Maintenance: ${title}`}
    >
      <Ionicons name="build" size={64} color={colors.warning} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {estimatedCompletion ? (
        <View style={styles.estimateContainer}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <Text style={styles.estimate}>Estimated completion: {estimatedCompletion}</Text>
        </View>
      ) : null}
      <Text style={styles.apology}>We apologize for any inconvenience.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    lineHeight: typography.lineHeights.sm,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  estimateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  estimate: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: typography.families.rounded,
  },
  apology: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
