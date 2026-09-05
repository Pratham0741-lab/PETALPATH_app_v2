import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import { useChildStore } from '../../store/childStore';
import { useAppStore } from '../../store/appStore';
import { authService } from '../../services/auth/authService';
import { typography } from '../../theme/typography';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { PetalMark } from '../../components/brand/PetalMark';

export const SplashScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);
  const refreshChildren = useChildStore((state) => state.refreshChildren);
  const childrenList = useChildStore((state) => state.childrenList);
  const loadSession = useAppStore((state) => state.loadSession);
  const setSessionApp = useAppStore((state) => state.setSession);

  const handleHydration = useCallback(async () => {
    try {
      await hydrateSession();
    } catch {}
    await loadSession();

    const currentToken = useAuthStore.getState().token || useAppStore.getState().token;
    if (currentToken) {
      const isExpired = authService.isTokenExpired(currentToken);
      if (isExpired) {
        const refreshed = await authService.refreshSession();
        if (!refreshed) {
          useAuthStore.getState().clearSession();
          useAppStore.getState().clearSession();
        }
      }

      try {
        await refreshChildren();
      } catch {}
    }
  }, [hydrateSession, loadSession, refreshChildren]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    handleHydration();
  }, [fadeAnim, scaleAnim, handleHydration]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessibilityLabel="PetalPath loading"
      accessibilityRole="progressbar"
    >
      {/* The opening scene, behind the logo. Sized in exact pixels and stretched
          to the screen, matching how AppShell draws every other wallpaper. */}
      <Image
        source={SCREEN_BACKGROUNDS.welcome}
        resizeMode="stretch"
        style={{ position: 'absolute', top: 0, left: 0, width: windowWidth, height: windowHeight }}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/brand/petalpath-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="PetalPath"
        />
        <Text
          style={[styles.tagline, { color: colors.textSecondary }]}
          accessibilityRole="text"
        >
          Your language learning journey
        </Text>
      </Animated.View>

      <View style={styles.spinner} accessibilityLabel="Loading your session">
        <PetalMark size={72} loading />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: typography.sizes.huge,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
  },
});

export default SplashScreen;
