import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { IconWell, PrimaryButton } from '../design';
import { PetalIcon } from '../icons';

/**
 * Global error boundary — the last screen a child ever wants to see, so it is
 * at least dressed like the rest of the app (§35).
 *
 * Behaviour is unchanged: the same `getDerivedStateFromError`, the same
 * `componentDidCatch` logging, the same optional `fallback`, the same reset, and
 * the technical-details toggle still shows name, message and stack for whoever
 * is debugging.
 *
 * The chrome moved onto the design system: an `IconWell` instead of a bare
 * Ionicons face, `PrimaryButton` instead of a hand-rolled pink pill, and the
 * "▲/▼" text arrows are real `arrowUp`/`arrowDown` glyphs (§7). The details
 * toggle is deliberately quiet — muted, small, and below the message — because
 * the child needs the Try Again button, not the stack.
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary caught exception]:', error, errorInfo.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  private toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, showDetails } = this.state;

    return (
      <View
        style={styles.container}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        accessibilityLabel="An unexpected error occurred"
      >
        <IconWell icon="warning" color={colors.error} soft={colors.errorLight} size={80} />

        <Text style={[typography.presets.title, styles.title]}>Something went wrong</Text>
        <Text style={[typography.presets.body, styles.message]}>
          PetalPath hit an unexpected problem. Please try again.
        </Text>

        {error ? (
          <Pressable
            style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}
            onPress={this.toggleDetails}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            accessibilityLabel={showDetails ? 'Hide technical details' : 'Show technical details'}
          >
            <Text style={[typography.presets.caption, styles.detailsToggleText]}>
              {showDetails ? 'Hide technical details' : 'Show technical details'}
            </Text>
            <PetalIcon
              name={showDetails ? 'arrowUp' : 'arrowDown'}
              size={14}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}

        {error && showDetails ? (
          <ScrollView
            style={styles.stackContainer}
            contentContainerStyle={styles.stackContent}
            accessibilityLabel="Error details"
          >
            <Text selectable style={styles.stackLabel}>
              {error.name || 'Error'}
            </Text>
            <Text selectable style={styles.stackMessage}>
              {error.message || String(error)}
            </Text>
            {error.stack ? (
              <Text selectable style={styles.stackTrace}>
                {error.stack}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}

        <PrimaryButton
          label="Try Again"
          icon="replay"
          onPress={this.handleReset}
          fullWidth={false}
          style={styles.resetButton}
          accessibilityHint="Resets the application state and retries"
        />
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
  title: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  detailsToggleText: {
    color: colors.textMuted,
    fontWeight: '700',
  },

  // The stack is for whoever is debugging, so it stays monospaced and plain.
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
    color: colors.errorDark,
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
    minWidth: 200,
  },
});

export default ErrorBoundary;
