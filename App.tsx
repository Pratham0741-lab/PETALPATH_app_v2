import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { useTutorialStore } from './src/store/tutorialStore';

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
  prefixes: ['http://localhost:8081', 'petalpath://'],
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
  // Hydrate tutorial settings from AsyncStorage on app launch
  useEffect(() => {
    useTutorialStore.getState().loadSettings();
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}

