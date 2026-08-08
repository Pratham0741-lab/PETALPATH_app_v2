import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { activityApi } from '../../services/api/activityApi';
import { api } from '../../api/client';
import { useSubmitGameScore } from '../../hooks/useActivityProgress';
import { useActivitySync } from '../../hooks/useActivitySync';
import { useTheme } from '../../theme/ThemeContext';
import type { GameData } from '../../components/activities/types';
import { DragDropMatch } from '../../components/activities/DragDropMatch';
import type { DragDropSpec } from '../../components/activities/types';
import type { ApiResponse } from '../../types/api';

import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';

type GameRouteParams = {
  Game: { activityId: string; dragDropSpec?: DragDropSpec; title?: string };
};

export const GameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<GameRouteParams, 'Game'>>();
  const route = useRoute<RouteProp<GameRouteParams, 'Game'>>();
  const { activityId, dragDropSpec } = route.params;
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const submitScore = useSubmitGameScore();
  const { syncAfterActivity } = useActivitySync();

  const [activeSpec, setActiveSpec] = useState<DragDropSpec | null>(dragDropSpec ?? null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleNextActivity = useCallback(async () => {
    const currentId = activityId || (activeSpec as any)?.curriculumRef?.nodeId || (activeSpec as any)?.id || '';
    const next = getNextActivity(currentId);
    if (next) {
      await navigateToActivity(navigation as any, next);
    } else {
      (navigation as any).navigate('LessonComplete');
    }
  }, [activityId, activeSpec, navigation]);

  const fetchGame = useCallback(async () => {
    if (dragDropSpec) {
      setActiveSpec(dragDropSpec);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');
    setGameData(null);
    try {
      const actRes = await api.get(`/activities/${activityId}`);
      if (actRes.success && actRes.data && (actRes.data as any).dragDropSpec) {
        setActiveSpec((actRes.data as any).dragDropSpec);
        setIsLoading(false);
        return;
      }

      const res = await activityApi.getGame(activityId);
      const response = res as unknown as ApiResponse<GameData>;
      if (response.success && response.data) {
        setGameData(response.data);
      } else {
        setIsError(true);
        setErrorMessage(response.message ?? 'Failed to load game data.');
      }
    } catch (err) {
      setIsError(true);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [activityId, dragDropSpec]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleStarPress = useCallback((star: number) => {
    setScore(star);
  }, []);

  const handleFinish = useCallback(() => {
    setIsCompleted(true);
    setIsPlaying(false);
  }, []);

  const handleSubmitScore = useCallback(async () => {
    if (score < 1) return;
    try {
      await submitScore.mutateAsync({ activityId, score });
      syncAfterActivity();
      navigation.goBack();
    } catch {
      // submission error handled silently; user remains on screen
    }
  }, [activityId, score, submitScore, syncAfterActivity, navigation]);

  const gameTypeColorMap: Record<string, string> = {
    puzzle: theme.colors.success,
    memory: theme.colors.primary,
    adventure: theme.colors.secondary,
    quiz: theme.colors.warning,
    arcade: theme.colors.error,
  };

  const gameBadgeColor = gameTypeColorMap[gameData?.gameType ?? ''] ?? theme.colors.primary;

  const styles = createStyles(theme);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Skeleton variant="card" width="90%" height={220} style={styles.skeletonCard} />
          <Skeleton variant="text" width="60%" style={styles.skeletonText} />
          <Skeleton variant="text" width="40%" style={styles.skeletonText} />
          <Skeleton variant="rect" width={160} height={48} borderRadius={24} style={styles.skeletonButton} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load game"
            message={errorMessage}
            onRetry={fetchGame}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (activeSpec || activityId) {
    return (
      <ScreenContainer>
        <DragDropMatch
          spec={activeSpec as any}
          activityId={activityId}
          onExit={() => navigation.goBack()}
          onNext={handleNextActivity}
        />
      </ScreenContainer>
    );
  }

  if (!gameData) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <EmptyState
            icon="🎮"
            title="Game not found"
            message="This game activity is not available right now."
          />
        </View>
      </ScreenContainer>
    );
  }

  if (isPlaying) {
    return (
      <ScreenContainer>
        <View style={styles.playingContainer}>
          <View style={styles.topBar}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Ionicons name="arrow-back" size={20} color={theme.colors.text} />}
              label="Back"
              onPress={() => setIsPlaying(false)}
              accessibilityLabel="Exit game and go back"
            />
            <Text style={styles.playingTitle} accessibilityRole="header">{gameData.title}</Text>
          </View>

          <View style={styles.gameArea}>
            {gameData.contentUrl ? (
              <View
                style={styles.gameFrame}
                accessibilityLabel="Game content area"
                accessibilityHint="The game is running in this area"
              >
                <Ionicons name="game-controller" size={72} color={theme.colors.primary} />
                <Text style={styles.gameFrameText}>
                  {gameData.title}
                </Text>
                <Text style={styles.gameFrameHint}>
                  Game content loaded from activity source
                </Text>
              </View>
            ) : (
              <View style={styles.gameAreaPlaceholder}>
                <Ionicons name="play-circle" size={72} color={theme.colors.textMuted} />
                <Text style={styles.gameAreaPlaceholderText}>Interactive game area</Text>
                <Text style={styles.gameAreaPlaceholderHint}>
                  Complete the activity and tap Finish when done
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomBar}>
            <Button
              label="Finish Game"
              variant="primary"
              size="lg"
              onPress={handleFinish}
              leftIcon={<Ionicons name="checkmark-circle" size={20} color={theme.colors.textInverse} />}
              fullWidth
              accessibilityLabel="Complete the game and rate it"
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (isCompleted) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.scrollContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentInner, isDesktop && styles.contentInnerDesktop]}>
            <Card variant="elevated" padding="xl" style={styles.scoreCard}>
              <View style={styles.scoreIconRow}>
                <Ionicons name="star" size={52} color={theme.colors.accent} />
              </View>
              <Text style={styles.scoreTitle} accessibilityRole="header">
                How many stars?
              </Text>
              <Text style={styles.scoreSubtitle}>Rate your performance</Text>

              <View style={styles.starRow} accessibilityLabel="Star rating: tap to select score">
                {[1, 2, 3, 4, 5].map((star) => (
                  <View key={star}>
                    <Ionicons
                      name={score >= star ? 'star' : 'star-outline'}
                      size={44}
                      color={score >= star ? theme.colors.accent : theme.colors.textMuted}
                      onPress={() => handleStarPress(star)}
                      accessibilityRole="button"
                      accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                      accessibilityState={{ selected: score >= star }}
                    />
                  </View>
                ))}
              </View>

              <Button
                label={score > 0 ? `Submit ${score} Star${score > 1 ? 's' : ''}` : 'Select a rating'}
                variant="primary"
                size="lg"
                onPress={handleSubmitScore}
                loading={submitScore.isPending}
                disabled={score < 1}
                fullWidth
                style={styles.submitButton}
                accessibilityLabel="Submit your game score"
              />
            </Card>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, isDesktop && styles.contentInnerDesktop]}>
          <View style={styles.backRow}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Ionicons name="arrow-back" size={20} color={theme.colors.text} />}
              label="Back"
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back to previous screen"
            />
          </View>

          <Card variant="elevated" padding="xl" style={styles.gameCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="game-controller" size={60} color={theme.colors.primary} />
            </View>

            <Text style={styles.title} accessibilityRole="header">
              {gameData.title}
            </Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: gameBadgeColor + '20' }]}>
                <Text style={[styles.badgeText, { color: gameBadgeColor }]}>
                  {gameData.gameType}
                </Text>
              </View>
            </View>

            {gameData.config && Object.keys(gameData.config).length > 0 && (
              <View style={styles.configSection}>
                <Text style={styles.configLabel}>Game Settings</Text>
                {Object.entries(gameData.config).map(([key, value]) => (
                  <View key={key} style={styles.configRow}>
                    <Text style={styles.configKey}>{key}</Text>
                    <Text style={styles.configValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Button
              label="Play"
              variant="primary"
              size="lg"
              onPress={handlePlay}
              leftIcon={<Ionicons name="play" size={22} color={theme.colors.textInverse} />}
              fullWidth
              style={styles.playButton}
              accessibilityLabel="Start playing the game"
            />
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl * 2,
    },
    scrollContentDesktop: {
      alignItems: 'center',
    },
    contentInner: {
      padding: theme.spacing.lg,
    },
    contentInnerDesktop: {
      maxWidth: 640,
      width: '100%',
    },
    backRow: {
      marginBottom: theme.spacing.md,
    },
    skeletonCard: {
      marginBottom: theme.spacing.lg,
    },
    skeletonText: {
      marginBottom: theme.spacing.sm,
    },
    skeletonButton: {
      marginTop: theme.spacing.md,
    },
    gameCard: {
      alignItems: 'center',
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.primary + '10',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.sizes.xxl,
      fontWeight: theme.typography.weights.black,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    badgeRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
    },
    badge: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.chip,
    },
    badgeText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.bold,
      textTransform: 'capitalize',
    },
    configSection: {
      width: '100%',
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    configLabel: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    configRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
    },
    configKey: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      textTransform: 'capitalize',
    },
    configValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontWeight: theme.typography.weights.medium,
    },
    playButton: {
      marginTop: theme.spacing.sm,
    },
    playingContainer: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    playingTitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginLeft: theme.spacing.sm,
      flex: 1,
    },
    gameArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    gameFrame: {
      width: '100%',
      height: 320,
      borderRadius: theme.radius.card,
      backgroundColor: theme.colors.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    gameFrameText: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginTop: theme.spacing.md,
    },
    gameFrameHint: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },
    gameAreaPlaceholder: {
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    gameAreaPlaceholderText: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
    },
    gameAreaPlaceholderHint: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    bottomBar: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    scoreCard: {
      alignItems: 'center',
    },
    scoreIconRow: {
      marginBottom: theme.spacing.md,
    },
    scoreTitle: {
      fontSize: theme.typography.sizes.xxl,
      fontWeight: theme.typography.weights.black,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    scoreSubtitle: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    starRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    submitButton: {
      marginTop: theme.spacing.sm,
    },
  });
