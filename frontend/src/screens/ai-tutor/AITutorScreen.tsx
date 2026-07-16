import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { activityApi } from '../../services/api/activityApi';
import { useActivitySync } from '../../hooks/useActivitySync';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import type { ApiResponse } from '../../types/api';

type AITutorRouteParams = {
  AITutor: { activityId: string };
};

type AITutorSession = {
  sessionId: string;
  topic: string;
};

export const AITutorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AITutorRouteParams, 'AITutor'>>();
  const { activityId } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const { syncAfterActivity } = useActivitySync();

  const [session, setSession] = useState<AITutorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const isSessionActive = session !== null;

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<AITutorSession> = await activityApi.getAITutorSession(activityId);
      if (response.success && response.data) {
        setSession(response.data);
      } else {
        setError(response.message ?? 'Failed to load AI tutor session.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleStartSession = useCallback(() => {
    if (!session) return;
    setStarting(true);
    navigation.navigate('AITutorSession', { sessionId: session.sessionId, activityId });
  }, [session, activityId, navigation]);

  const handleComplete = useCallback(() => {
    syncAfterActivity();
    navigation.goBack();
  }, [syncAfterActivity, navigation]);

  const isTablet = windowWidth >= 768;

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Skeleton variant="circle" width={96} height={96} style={styles.skeletonIcon} />
          <Skeleton variant="text" width={200} height={24} style={styles.skeletonText} />
          <Skeleton variant="text" width={280} height={16} style={styles.skeletonText} />
          <Skeleton variant="rect" width={200} height={48} style={styles.skeletonButton} />
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load AI Tutor"
            message={error}
            onRetry={fetchSession}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={[styles.heroSection, isTablet && styles.heroSectionTablet]}>
          <View style={styles.iconContainer}>
            <Ionicons name="chatbubbles" size={64} color={colors.primary} />
          </View>

          <Text
            style={[styles.title, isTablet && styles.titleTablet]}
            accessibilityRole="header"
          >
            {session?.topic ?? 'AI Tutor'}
          </Text>

          <Text style={[styles.description, isTablet && styles.descriptionTablet]}>
            Practice your skills with your AI tutor!
          </Text>
        </View>

        <Card variant="elevated" padding="lg" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Your AI tutor will guide you through interactive exercises and provide
              personalised feedback to help you improve.
            </Text>
          </View>
        </Card>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Session Status</Text>
          <View
            style={[
              styles.badge,
              isSessionActive ? styles.badgeActive : styles.badgeInactive,
            ]}
            accessibilityRole="text"
            accessibilityLabel={isSessionActive ? 'Session active' : 'Session inactive'}
          >
            <View
              style={[
                styles.badgeDot,
                isSessionActive ? styles.badgeDotActive : styles.badgeDotInactive,
              ]}
            />
            <Text
              style={[
                styles.badgeText,
                isSessionActive ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {isSessionActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.sessionIdRow}>
          <Text style={styles.sessionIdLabel}>Session ID</Text>
          <Text style={styles.sessionIdValue} selectable>
            {session?.sessionId ?? '—'}
          </Text>
        </View>

        <Button
          title="Start Session"
          onPress={handleStartSession}
          variant="primary"
          size="lg"
          fullWidth
          loading={starting}
          disabled={!isSessionActive || starting}
          leftIcon={<Ionicons name="play" size={20} color={colors.textInverse} />}
          style={styles.startButton}
        />

        <Button
          title="Mark as Complete"
          onPress={handleComplete}
          variant="outline"
          size="md"
          fullWidth
          style={styles.completeButton}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  skeletonIcon: {
    marginBottom: spacing.lg,
  },
  skeletonText: {
    marginBottom: spacing.md,
  },
  skeletonButton: {
    marginTop: spacing.lg,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  scrollContentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  heroSectionTablet: {
    paddingTop: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleTablet: {
    fontSize: typography.sizes.xxxl,
  },
  description: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  descriptionTablet: {
    fontSize: typography.sizes.lg,
    lineHeight: 26,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  statusLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  badgeActive: {
    backgroundColor: `${colors.success}20`,
  },
  badgeInactive: {
    backgroundColor: `${colors.textMuted}20`,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  badgeDotActive: {
    backgroundColor: colors.success,
  },
  badgeDotInactive: {
    backgroundColor: colors.textMuted,
  },
  badgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  badgeTextActive: {
    color: colors.success,
  },
  badgeTextInactive: {
    color: colors.textMuted,
  },
  sessionIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  sessionIdLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  sessionIdValue: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  startButton: {
    marginBottom: spacing.md,
  },
  completeButton: {
    marginBottom: spacing.lg,
  },
});
