import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows } from '../../theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (IS_DEV) {
      console.error('[ErrorBoundary]', error, errorInfo.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error } = this.state;

    return (
      <View
        style={styles.container}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        accessibilityLabel="An unexpected error occurred"
      >
        <View style={styles.iconContainer}>
          <Ionicons name="sad-outline" size={48} color={colors.error} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          PetalPath hit an unexpected problem. Please try again.
        </Text>

        {IS_DEV && error ? (
          <ScrollView
            style={styles.stackContainer}
            contentContainerStyle={styles.stackContent}
            accessibilityLabel="Error details"
          >
            <Text selectable style={styles.stackLabel}>
              {error.name}
            </Text>
            <Text selectable style={styles.stackMessage}>
              {error.message}
            </Text>
            {error.stack ? (
              <Text selectable style={styles.stackTrace}>
                {error.stack}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={this.handleReset}
          accessibilityRole="button"
          accessibilityLabel="Try Again"
          accessibilityHint="Resets the application state and retries"
        >
          <Ionicons name="refresh" size={20} color={colors.white} style={styles.resetIcon} />
          <Text style={styles.resetText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    fontFamily: typography.families.rounded,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
    lineHeight: typography.lineHeights.sm,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  stackContainer: {
    maxHeight: 200,
    width: '100%',
    marginBottom: spacing.xl,
  },
  stackContent: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stackLabel: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontFamily: 'monospace',
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  stackMessage: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  stackTrace: {
    fontSize: typography.sizes.caption,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    ...shadows.md,
  },
  resetIcon: {
    marginRight: spacing.sm,
  },
  resetText: {
    color: colors.white,
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
});
