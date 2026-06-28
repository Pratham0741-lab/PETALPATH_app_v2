import React, { useEffect, useState, useCallback } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet as RNStyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { useTutorialStore } from './src/store/tutorialStore';
import { checkServerHealth } from './src/api/health';
import { IS_DEV } from './src/config/api';

// Inject global web styles for video scaling on web
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

      // Desktop direct screens
      Home: 'home',
      Journey: 'journey',
      Mentor: 'mentor',
      Rewards: 'rewards',
      Profile: 'profile',

      // Mobile Nested Tabs
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

export default function App() {
  const [serverReady, setServerReady] = useState<boolean | null>(null);

  const runHealthCheck = useCallback(async () => {
    setServerReady(null); // show loading
    const { isHealthy } = await checkServerHealth();
    if (IS_DEV) {
      console.log(`[App] Server health: ${isHealthy ? 'OK' : 'UNREACHABLE'}`);
    }
    setServerReady(isHealthy);
  }, []);

  // Hydrate tutorial settings + run health check on app launch
  useEffect(() => {
    useTutorialStore.getState().loadSettings();
    runHealthCheck();
  }, [runHealthCheck]);

  // Loading state
  if (serverReady === null) {
    return (
      <View style={healthStyles.container}>
        <ActivityIndicator size="large" color="#7C5CBF" />
        <Text style={healthStyles.loadingText}>Connecting to PetalPath...</Text>
      </View>
    );
  }

  // Server unreachable — retry screen
  if (!serverReady) {
    return (
      <View style={healthStyles.container}>
        <Text style={healthStyles.emoji}>🌸</Text>
        <Text style={healthStyles.title}>Unable to connect</Text>
        <Text style={healthStyles.message}>
          Unable to connect to PetalPath servers.{'\n'}
          Please check your internet connection and try again.
        </Text>
        <TouchableOpacity style={healthStyles.retryButton} onPress={runHealthCheck}>
          <Text style={healthStyles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const healthStyles = RNStyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F3',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7C5CBF',
    fontWeight: '500',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7C5CBF',
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

