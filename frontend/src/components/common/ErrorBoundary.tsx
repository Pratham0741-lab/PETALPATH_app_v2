/**
 * Application-level Error Boundary
 *
 * Catches React render errors anywhere below it and shows a friendly,
 * child-safe fallback. In development it also surfaces the component stack
 * to help debugging; in production it shows only safe messaging.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../theme';

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
    // In a real deployment this would be reported to an error tracker.
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

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🌸</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          PetalPath hit an unexpected problem. Please try again.
        </Text>

        {IS_DEV && this.state.error ? (
          <ScrollView style={styles.stackContainer} contentContainerStyle={styles.stackContent}>
            <Text selectable style={styles.stackText}>
              {this.state.error.name}: {this.state.error.message}
            </Text>
            {this.state.error.stack ? (
              <Text selectable style={styles.stackText}>
                {this.state.error.stack}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}

        <TouchableOpacity style={styles.retryButton} onPress={this.handleReset}>
          <Text style={styles.retryText}>Try Again</Text>
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
    padding: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  stackContainer: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 24,
  },
  stackContent: {
    backgroundColor: '#FBEAEA',
    padding: 12,
    borderRadius: 8,
  },
  stackText: {
    fontSize: 11,
    color: '#9B2C2C',
    fontFamily: 'monospace',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
