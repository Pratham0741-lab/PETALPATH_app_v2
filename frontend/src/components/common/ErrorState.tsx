/**
 * Error state components
 *
 * - ErrorState: generic error display with an optional retry action
 * - NetworkError: specialized variant for connectivity failures
 *
 * Both render child-safe, friendly messaging. They are presentational only
 * and receive messages/retries from callers (often via the ApiError helper).
 *
 * Icons are SVG rather than emoji (spec §7) and the retry uses the shared
 * button so it matches every other action in the app.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';
import { PrimaryButton } from '../design/Buttons';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

const Base: React.FC<ErrorStateProps & { icon: PetalIconName }> = ({
  icon,
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
}) => (
  <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="assertive">
    <View style={styles.iconWell}>
      <PetalIcon name={icon} size={32} color={colors.error} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {onRetry ? (
      <PrimaryButton
        label={retryLabel}
        icon="replay"
        onPress={onRetry}
        fullWidth={false}
        accessibilityHint="Attempts the action again"
      />
    ) : null}
  </View>
);

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Please try again.',
  ...rest
}) => <Base icon="warning" title={title} message={message} {...rest} />;

export const NetworkError: React.FC<Omit<ErrorStateProps, 'title'>> = ({
  message = 'Check your internet connection and try again.',
  ...rest
}) => <Base icon="warning" title="Unable to connect" message={message} {...rest} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: spacing.xxl,
  },
  iconWell: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.presets.section,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.xl,
  },
});
