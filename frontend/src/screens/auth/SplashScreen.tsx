import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import { useChildStore } from '../../store/childStore';
import { useAppStore } from '../../store/appStore';
import { authService } from '../../services/auth/authService';
import { typography } from '../../theme/typography';

export const SplashScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { colors } = theme;

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
    } catch {
      await loadSession();
    }

    if (isAuthenticated) {
      const token = useAuthStore.getState().token;
      if (token) {
        const isValid = !authService.isTokenExpired(token);
        if (isValid) {
          const refreshed = await authService.refreshSession();
          if (refreshed) {
            const currentUser = useAuthStore.getState().user;
            const currentToken = useAuthStore.getState().token;
            const currentRefreshToken = useAuthStore.getState().refreshToken;
            if (currentUser && currentToken && currentRefreshToken) {
              await setSessionApp({
                accessToken: currentToken,
                refreshToken: currentRefreshToken,
                user: currentUser,
              });
            }
            try {
              await refreshChildren();
            } catch {
              // children fetch is best-effort on splash
            }
          }
        }
      }
    }

    useAppStore.getState().loadSession();
  }, [hydrateSession, isAuthenticated, loadSession, setSessionApp, refreshChildren]);

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
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text
          style={[styles.logo, { color: colors.primary }]}
          accessibilityRole="text"
        >
          🌸
        </Text>
        <Text
          style={[styles.appName, { color: colors.text }]}
          accessibilityRole="header"
        >
          PetalPath
        </Text>
        <Text
          style={[styles.tagline, { color: colors.textSecondary }]}
          accessibilityRole="text"
        >
          Your language learning journey
        </Text>
      </Animated.View>

      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
        accessibilityLabel="Loading your session"
      />
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
    fontSize: 72,
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
