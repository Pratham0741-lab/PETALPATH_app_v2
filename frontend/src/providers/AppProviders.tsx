/**
 * App Providers
 *
 * Composes the global application providers in a single, ordered tree so the
 * app root stays clean and provider ordering is centralized.
 *
 * Order:
 *   QueryProvider  → TanStack Query (data fetching cache)
 *     AuthProvider → auth session hydration + context
 *       ErrorBoundary → catches render errors in the tree below
 *
 * Render errors are caught closest to the UI (inside ErrorBoundary) while
 * data/query infrastructure wraps everything. Devtools are mounted by
 * QueryProvider only in development.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { OfflineBanner } from '../components/common/OfflineBanner';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <View style={styles.root}>
          <OfflineBanner />
          <ErrorBoundary>{children}</ErrorBoundary>
        </View>
      </AuthProvider>
    </QueryProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
