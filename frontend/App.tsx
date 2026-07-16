import React, { useEffect, useState, useCallback } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { useTutorialStore } from './src/store/tutorialStore';
import { checkServerHealth } from './src/api/health';
import { AppProviders } from './src/providers/AppProviders';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { lightColors, darkColors } from './src/theme/colors';
import { spacing } from './src/theme/spacing';
import { radius } from './src/theme/radius';
import { IS_DEV, API_BASE_URL } from './src/config/api';

if (Platform.OS !== 'web') {
  try {
    const { setAudioModeAsync } = require('expo-audio');
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
    });
  } catch (e) {
    if (IS_DEV) console.warn('Failed to configure audio mode:', e);
  }
}

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(
    document.createTextNode(`
      video {
        object-fit: contain !important;
        width: 100% !important;
        height: 100% !important;
      }
    `)
  );
  document.head.appendChild(style);
}

const linking = {
  prefixes: ['petalpath://'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
      ChildSelection: 'select-profile',
      AddChild: 'add-profile',
      MentorSelection: 'select-companion',
      LessonOverview: 'lesson/:lessonId',
      Video: 'video',
      VideoCompleted: 'video-completed',
      Listen: 'listen',
      Speak: 'speak',
      Write: 'write',
      Progress: 'progress',
      Stories: 'stories',
      Home: 'home',
      Journey: 'journey',
      Mentor: 'mentor',
      Rewards: 'rewards',
      Profile: 'profile',
      MainTabs: {
        path: 'mobile',
        screens: {
          Home: 'home',
          Journey: 'journey',
          Mentor: 'mentor',
          Rewards: 'rewards',
          Profile: 'profile',
        },
      },
    },
  },
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [requestedUrl, setRequestedUrl] = useState<string | null>(null);

  const runHealthCheck = useCallback(async () => {
    setServerReady(null);
    const result = await checkServerHealth();
    if (IS_DEV) {
      console.log(`[App] Server health: ${result.isHealthy ? 'OK' : 'UNREACHABLE'}`);
    }
    setErrorDetails(result.errorDetails || null);
    setRequestedUrl(result.requestedUrl || null);
    setServerReady(result.isHealthy);
  }, []);

  useEffect(() => {
    useTutorialStore.getState().loadSettings();
    runHealthCheck();
  }, [runHealthCheck]);

  if (serverReady === null) {
    return (
      <View style={[healthStyles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[healthStyles.loadingText, { color: colors.textSecondary }]}>
          Connecting to PetalPath...
        </Text>
      </View>
    );
  }

  if (!serverReady) {
    return (
      <View style={[healthStyles.container, { backgroundColor: colors.background }]}>
        <Text style={healthStyles.emoji}>🌸</Text>
        <Text style={[healthStyles.title, { color: colors.text }]}>Unable to connect</Text>
        <Text style={[healthStyles.message, { color: colors.textSecondary }]}>
          Unable to connect to PetalPath servers.{'\n'}
          Please check your internet connection and try again.
        </Text>
        {IS_DEV ? (
          <View style={healthStyles.debugContainer}>
            <Text style={healthStyles.debugText}>API_BASE_URL: {API_BASE_URL}</Text>
            <Text style={healthStyles.debugText}>
              ENV: {String(process.env.EXPO_PUBLIC_API_URL)}
            </Text>
            {requestedUrl && (
              <Text style={healthStyles.debugText}>URL: {requestedUrl}</Text>
            )}
            {errorDetails && (
              <Text style={[healthStyles.debugText, { color: colors.error, fontWeight: 'bold' }]}>
                ERROR: {errorDetails}
              </Text>
            )}
          </View>
        ) : null}
        <TouchableOpacity
          style={[healthStyles.retryButton, { backgroundColor: colors.primary }]}
          onPress={runHealthCheck}
          accessibilityRole="button"
          accessibilityLabel="Try connecting again"
        >
          <Text style={healthStyles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const healthStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  debugContainer: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 11,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
