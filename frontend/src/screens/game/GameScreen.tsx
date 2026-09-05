import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, radius, spacing, typography, cardSizes } from '../../theme';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { activityApi } from '../../services/api/activityApi';
import { api } from '../../api/client';
import { useSubmitGameScore } from '../../hooks/useActivityProgress';
import { useActivitySync } from '../../hooks/useActivitySync';
import type { GameData } from '../../components/activities/types';
import { DragDropMatch } from '../../components/activities/DragDropMatch';
import type { DragDropSpec } from '../../components/activities/types';
import type { ApiResponse } from '../../types/api';
import {
  AppShell,
  Card,
  IconWell,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StarRating,
} from '../../components/design';

import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { PetalMark } from '../../components/brand/PetalMark';

/**
 * Game — the host screen for Match & Learn, reference screen 9 (spec §34 phase 5).
 *
 * Every real route into here (`navigationFlow`, `LessonScreen`) passes an
 * `activityId`, so the drag & drop branch is the one children actually see and
 * `DragDropRenderer` owns that screen's chrome end to end. This file therefore
 * hands it the whole viewport — no wrapper shell, or the safe areas and warm
 * background would be applied twice.
 *
 * The generic "game" branches below (a Play card, a placeholder play area and a
 * five-star self-rating) only run when there is no activity id at all. They are
 * kept rather than deleted (§1) — the score submission through
 * `useSubmitGameScore` is real — but they are re-skinned so they cannot look
 * like a different app if they ever surface (§33).
 */

type GameRouteParams = {
  Game: { activityId: string; dragDropSpec?: DragDropSpec; title?: string };
};

/** Badge tint per game type, on the palette rather than raw theme roles (§3). */
const GAME_TYPE_COLORS: Record<string, { main: string; soft: string }> = {
  puzzle: { main: colors.leafGreen, soft: colors.greenSoft },
  memory: { main: colors.primary, soft: colors.primaryLight },
  adventure: { main: colors.secondary, soft: colors.secondaryLight },
  quiz: { main: colors.warning, soft: colors.warningLight },
  arcade: { main: colors.coral, soft: colors.errorLight },
};

export const GameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<GameRouteParams, 'Game'>>();
  const route = useRoute<RouteProp<GameRouteParams, 'Game'>>();
  const { activityId, dragDropSpec } = route.params;

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

  if (isLoading) {
    return (
      <AppShell
        scroll={false}
        petals="none"
        backgroundImage={SCREEN_BACKGROUNDS.match}
        header={<PageHeader title="Match & Learn" />}
      >
        <View style={styles.center}>
          <PetalMark size={96} loading />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Setting up the board…
          </Text>
        </View>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell
        scroll={false}
        petals="none"
        backgroundImage={SCREEN_BACKGROUNDS.match}
        header={<PageHeader title="Match & Learn" />}
        footer={<SecondaryButton label="Go Back" icon="back" onPress={() => navigation.goBack()} />}
      >
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this activity"
            message={errorMessage}
            onRetry={fetchGame}
          />
        </View>
      </AppShell>
    );
  }

  // The drag & drop renderer brings its own AppShell, header and footer, so it
  // gets the full viewport rather than being nested inside a second shell.
  if (activeSpec || activityId) {
    return (
      <DragDropMatch
        spec={activeSpec as any}
        activityId={activityId}
        onExit={() => navigation.goBack()}
        onNext={handleNextActivity}
      />
    );
  }

  if (!gameData) {
    return (
      <AppShell
        scroll={false}
        petals="none"
        backgroundImage={SCREEN_BACKGROUNDS.match}
        header={<PageHeader title="Match & Learn" />}
      >
        <View style={styles.center}>
          <EmptyState
            icon="match"
            title="Game not found"
            message="This game activity is not available right now."
          />
        </View>
      </AppShell>
    );
  }

  if (isPlaying) {
    return (
      <AppShell
        scroll={false}
        petals="none"
        backgroundImage={SCREEN_BACKGROUNDS.match}
        contentContainerStyle={styles.readable}
        header={
          <PageHeader
            title={gameData.title}
            onBack={() => setIsPlaying(false)}
            centered={false}
          />
        }
        footer={
          <PrimaryButton
            label="Finish Game"
            icon="check"
            tone="green"
            onPress={handleFinish}
            accessibilityHint="Completes the game and asks you to rate it"
          />
        }
      >
        <View style={styles.stage}>
          {gameData.contentUrl ? (
            <View
              style={styles.gameFrame}
              accessibilityLabel="Game content area"
              accessibilityHint="The game is running in this area"
            >
              <IconWell
                icon="match"
                color={colors.orange}
                soft={colors.warningLight}
                size={cardSizes.iconWellLarge}
              />
              <Text style={[typography.presets.cardTitle, styles.frameTitle]}>
                {gameData.title}
              </Text>
              <Text style={[typography.presets.caption, styles.frameHint]}>
                Game content loaded from activity source
              </Text>
            </View>
          ) : (
            <View style={styles.gameFrame}>
              <IconWell
                icon="play"
                color={colors.textMuted}
                soft={colors.surfaceSecondary}
                size={cardSizes.iconWellLarge}
              />
              <Text style={[typography.presets.cardTitle, styles.frameTitle]}>
                Interactive game area
              </Text>
              <Text style={[typography.presets.caption, styles.frameHint]}>
                Complete the activity and tap Finish when done
              </Text>
            </View>
          )}
        </View>
      </AppShell>
    );
  }

  if (isCompleted) {
    return (
      <AppShell
        petals="none"
        backgroundImage={SCREEN_BACKGROUNDS.match}
        contentContainerStyle={styles.readable}
        header={<PageHeader title="How did it go?" showBack={false} />}
        footer={
          <PrimaryButton
            label={score > 0 ? `Submit ${score} Star${score > 1 ? 's' : ''}` : 'Pick a rating first'}
            icon="star"
            tone="green"
            loading={submitScore.isPending}
            disabled={score < 1}
            onPress={handleSubmitScore}
            accessibilityHint="Saves your rating for this game"
          />
        }
      >
        <Card variant="raised" padding="roomy" accent={colors.yellow} style={styles.scoreCard}>
          <IconWell icon="star" color={colors.yellow} soft={colors.yellowSoft} filled />
          <Text style={[typography.presets.title, styles.scoreTitle]} accessibilityRole="header">
            How many stars?
          </Text>
          <Text style={[typography.presets.subtle, styles.scoreSubtitle]}>
            Tap a star to rate how the game went.
          </Text>

          <StarRating
            value={score}
            max={5}
            size="lg"
            onSelect={handleStarPress}
            selectLabel="Rate this game out of five stars"
            style={styles.stars}
          />
        </Card>
      </AppShell>
    );
  }

  const badge = GAME_TYPE_COLORS[gameData.gameType] ?? {
    main: colors.primary,
    soft: colors.primaryLight,
  };

  return (
    <AppShell
      petals="none"
      backgroundImage={SCREEN_BACKGROUNDS.match}
      contentContainerStyle={styles.readable}
      header={<PageHeader title="Match & Learn" />}
      footer={
        <PrimaryButton
          label="Play"
          icon="play"
          onPress={handlePlay}
          accessibilityHint="Starts the game"
        />
      }
    >
      <Card variant="raised" padding="roomy" accent={badge.main} style={styles.gameCard}>
        <IconWell
          icon="match"
          color={badge.main}
          soft={badge.soft}
          size={cardSizes.iconWellLarge}
        />

        <Text style={[typography.presets.title, styles.gameTitle]} accessibilityRole="header">
          {gameData.title}
        </Text>

        <View style={[styles.typePill, { backgroundColor: badge.soft }]}>
          <Text style={[typography.presets.eyebrow, styles.typePillText, { color: badge.main }]}>
            {gameData.gameType}
          </Text>
        </View>

        {gameData.config && Object.keys(gameData.config).length > 0 && (
          <View style={styles.configSection}>
            <Text style={[typography.presets.eyebrow, styles.configLabel]}>Game Settings</Text>
            {Object.entries(gameData.config).map(([key, value]) => (
              <View key={key} style={styles.configRow}>
                <Text style={[typography.presets.caption, styles.configKey]}>{key}</Text>
                <Text style={[typography.presets.caption, styles.configValue]}>
                  {String(value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </AppShell>
  );
};

export default GameScreen;

const styles = StyleSheet.create({
  /**
   * Caps the column instead of branching on a 768px breakpoint: a single card
   * stretched across a desktop window reads badly, and a max-width does the job
   * at every size without a hardcoded layout (§27).
   */
  readable: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // ------------------------------------------------------------- play surface
  stage: {
    flex: 1,
    justifyContent: 'center',
  },
  gameFrame: {
    width: '100%',
    /* Grows with the space available instead of a fixed 320px box (§27). */
    flexGrow: 1,
    maxHeight: 420,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  frameTitle: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  frameHint: {
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // -------------------------------------------------------------- rating card
  scoreCard: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreTitle: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  scoreSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stars: {
    marginTop: spacing.md,
  },

  // ---------------------------------------------------------------- game card
  gameCard: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  gameTitle: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  typePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  typePillText: {
    textTransform: 'capitalize',
  },
  configSection: {
    width: '100%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.cardInner,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  configLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  configKey: {
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  configValue: {
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
});
