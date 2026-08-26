import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeContext';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { PendingSyncIndicator } from '../components/common/PendingSyncIndicator';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <View style={styles.root}>
              <OfflineBanner />
              <PendingSyncIndicator />
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </View>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
