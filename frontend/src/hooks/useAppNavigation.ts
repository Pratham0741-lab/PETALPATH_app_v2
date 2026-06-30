import { useNavigation } from '@react-navigation/native';
import { useDeviceType } from './useDeviceType';
import { useCallback } from 'react';

/**
 * Returns a navigation helper that routes to top-level screens
 * correctly regardless of device type.
 *
 * On mobile, tab screens live inside a nested "MainTabs" Tab navigator,
 * so we navigate via: navigate('MainTabs', { screen: 'Journey' }).
 *
 * On tablet/desktop, all screens are direct children of the root Stack,
 * so we navigate via: navigate('Journey').
 */
export const useAppNavigation = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile';

  /**
   * Navigate to a tab screen (Home, Journey, Mentor, Rewards, Profile).
   * Handles the mobile vs tablet navigation tree difference.
   */
  const navigateToTab = useCallback(
    (screen: 'Home' | 'Journey' | 'Mentor' | 'Rewards' | 'Profile') => {
      if (isMobile) {
        navigation.navigate('MainTabs', { screen });
      } else {
        navigation.navigate(screen);
      }
    },
    [navigation, isMobile]
  );

  /**
   * Navigate to a non-tab screen (LessonOverview, Video, etc.).
   * These exist at the root Stack level on all device types.
   */
  const navigateTo = useCallback(
    (screen: string, params?: Record<string, any>) => {
      navigation.navigate(screen, params);
    },
    [navigation]
  );

  return { navigateToTab, navigateTo, navigation, isMobile };
};
