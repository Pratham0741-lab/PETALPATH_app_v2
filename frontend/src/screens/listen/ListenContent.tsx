import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, cardSizes, MediaOrbSizeToken, layoutSizes } from '../../theme';
import { useListenStore } from '../../store/listenStore';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { UniversalAudioPlayer } from '../../utils/audioPlayer';
import {
  getActivityPosition,
  getNextActivity,
  navigateToActivity,
} from '../../utils/navigationFlow';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';
import { ErrorState } from '../../components/common/ErrorState';
import { PetalMark } from '../../components/brand/PetalMark';
import {
  ActivityHeader,
  AnswerGrid,
  AnswerOption,
  AnswerOptionState,
  AppShell,
  AvatarGlyph,
  Card,
  FeedbackBanner,
  IconWell,
  MediaOrb,
  MentorCard,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '../../components/design';

/**
 * Listen & Choose — reference screen 7 (spec §34 phase 5).
 *
 * One implementation for all three device variants (§28: "Do not duplicate the
 * same UI markup across pages"). The three files it replaces had drifted apart
 * in more ways than LessonOverview's did — different prompts, different praise
 * wording, a "Sound Lab" heading only on desktop, a 35px tutorial-hand offset
 * only on mobile, and no tutorial overlay at all on desktop — so `VARIANTS`
 * below spells every one of those out rather than letting them keep diverging.
 * Desktop's missing tutorial hand is preserved deliberately: adding one would
 * be a behaviour change dressed up as a redesign (§1).
 *
 * This is a re-skin, not a rewrite. `useListenStore` is still the only data
 * source, the `UniversalAudioPlayer` lifecycle and its `unload()` cleanup are
 * untouched, `measureTarget()` still drives the tutorial hand off the same two
 * refs, and `handleNextActivity` keeps the same next-activity → complete-lesson
 * → Journey fallback chain.
 *
 * What changed is the chrome: `AppShell` + `ActivityHeader` replace
 * `ScreenContainer` + `TopBar`, the four hand-rolled option colour variants
 * become the shared `AnswerOption`, and the header's step indicator — which
 * hard-coded four dots with the first two always lit — now reads the activity's
 * real position in the lesson (§33: no fake UI).
 */

export type ListenVariant = 'mobile' | 'tablet' | 'desktop';

interface ListenVariantConfig {
  /** Two-column layout with a mentor rail beside the activity. */
  wide: boolean;
  sidebarWidth: number;
  /** Question above the answer tiles. */
  prompt: string;
  orbSize: MediaOrbSizeToken;
  orbIdleLabel: string;
  orbActiveLabel: string;
  praise: string;
  nudge: string;
  /**
   * Vertical nudge when the tutorial hand points at the play control. Mobile
   * lifts it 35px so the hand doesn't cover the label; the wide layouts never
   * did, and matching them would move a hand users are used to.
   */
  orbHandOffset: number;
  /** Whether the tutorial overlay renders at all — false on desktop, as shipped. */
  guide: boolean;
  /** Desktop titled its play area; the narrower variants let the orb speak. */
  playHeading?: string;
  sidebarTitle: string;
}

const VARIANTS: Record<ListenVariant, ListenVariantConfig> = {
  mobile: {
    wide: false,
    sidebarWidth: 0,
    prompt: 'What shape or line did you hear?',
    orbSize: 'lg',
    orbIdleLabel: 'Tap to Listen',
    orbActiveLabel: 'Listening…',
    praise: 'Correct! Splendid job!',
    nudge: 'Not quite, try again!',
    orbHandOffset: -35,
    guide: true,
    sidebarTitle: '',
  },
  tablet: {
    wide: true,
    sidebarWidth: 280,
    prompt: 'Select the matching card:',
    orbSize: 'lg',
    orbIdleLabel: 'Play the Sound',
    orbActiveLabel: 'Playing Sound…',
    praise: 'Correct! Incredible work!',
    nudge: 'Not quite, try again!',
    orbHandOffset: 0,
    guide: true,
    sidebarTitle: 'Mascot Buddy',
  },
  desktop: {
    wide: true,
    sidebarWidth: 320,
    prompt: 'Select the matching card:',
    orbSize: 'lg',
    orbIdleLabel: 'Hear the Pronunciation',
    orbActiveLabel: 'Audio Playing…',
    praise: 'Correct! Incredible work!',
    nudge: 'Not quite, try again!',
    orbHandOffset: 0,
    guide: false,
    playHeading: 'Sound Lab',
    sidebarTitle: 'Mentor Guide',
  },
};

// ---------------------------------------------------------------------------
// Coming-soon variant
// ---------------------------------------------------------------------------

const ListenComingSoon: React.FC<{
  audio: any;
  navigation: any;
}> = ({ audio, navigation }) => {
  const { completeActivity } = useListenStore();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleProceed = async () => {
    setIsCompleting(true);
    try {
      await completeActivity();
      const next = getNextActivity(audio.activityId);
      if (next) {
        await navigateToActivity(navigation, next);
        return;
      }
      navigation.navigate('LessonOverview');
    } catch (err) {
      if (__DEV__) console.warn('Failed to complete and proceed:', err);
      navigation.navigate('LessonOverview');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.listen}
      scroll={false}
      header={<PageHeader title={audio.title || 'Audio Guide'} />}
      footer={
        <PrimaryButton
          label="Proceed to Next Activity"
          icon="forward"
          onPress={handleProceed}
          loading={isCompleting}
        />
      }
    >
      <View style={styles.center}>
        <Card variant="raised" padding="roomy" accent={colors.blue} style={styles.comingSoonCard}>
          <IconWell
            icon="listen"
            color={colors.blue}
            soft={colors.blueSoft}
            size={cardSizes.iconWellLarge}
          />
          <Text style={[typography.presets.section, styles.comingSoonTitle]}>Audio Coming Soon</Text>
          <Text style={[typography.presets.body, styles.comingSoonBody]}>
            Our team is preparing a magical audio guide for this lesson.
          </Text>
          <Text style={[typography.presets.caption, styles.comingSoonBody]}>
            You don't have to wait — tap the button below to carry on with the learning activities.
          </Text>
        </Card>
      </View>
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// Listen & Choose
// ---------------------------------------------------------------------------

export const ListenContent: React.FC<{ variant?: ListenVariant }> = ({ variant = 'mobile' }) => {
  const cfg = VARIANTS[variant];
  const navigation = useNavigation<any>();
  const {
    currentAudio,
    selectedAnswer,
    correctAnswer,
    options,
    loading,
    error,
    selectAnswer,
    submitAnswer,
    retry,
    isComingSoon,
    lives,
  } = useListenStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<UniversalAudioPlayer | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const reduceMotion = useReducedMotion();

  const activeChild = useChildStore((state) => state.activeChild);
  const mentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

  const speakerRef = useRef<View>(null);
  const actionBtnRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);

  const measureTarget = () => {
    // Desktop never showed the hand, so there is nothing to point at.
    if (!cfg.guide) return;

    if (answered || selectedAnswer) {
      if (actionBtnRef.current) {
        actionBtnRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else if (speakerRef.current) {
      speakerRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setHandCoords({ x: x + width / 2, y: y + height / 2 + cfg.orbHandOffset });
        }
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(measureTarget, 200);
    return () => clearTimeout(timer);
  }, [answered, selectedAnswer, isPlaying, currentAudio]);

  useEffect(() => {
    if (currentAudio) {
      const audioPlayer = new UniversalAudioPlayer(
        currentAudio.audioUrl,
        () => {
          setIsPlaying(false);
          setPlayProgress(1);
        },
        (pos, dur) => {
          if (dur > 0) {
            setPlayProgress(pos / dur);
          }
        }
      );
      setPlayer(audioPlayer);

      return () => {
        audioPlayer.unload();
      };
    }
  }, [currentAudio]);

  const handlePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      if (playProgress >= 1) {
        setPlayProgress(0);
      }
      player.play();
      setIsPlaying(true);
    }
  };

  const handleOptionPress = (option: string) => {
    if (answered) return;
    selectAnswer(option);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;
    const isCorrect = await submitAnswer();
    setAnswered(true);
    setFeedback(isCorrect ? cfg.praise : cfg.nudge);
  };

  const handleRetry = () => {
    retry();
    setAnswered(false);
    setFeedback(null);
  };

  const handleNextActivity = async () => {
    if (!currentAudio) return;
    const next = getNextActivity(currentAudio.activityId);
    if (next) {
      await navigateToActivity(navigation, next);
      return;
    }
    const { selectedLesson } = useRoadmapStore.getState();
    if (selectedLesson) {
      await useRoadmapStore.getState().completeLesson(selectedLesson.id);
      navigation.navigate('LessonComplete');
    } else {
      navigation.navigate('MainTabs', { screen: 'Journey' });
    }
  };

  /** Real position in the lesson, replacing the hard-coded four step dots. */
  const position = useMemo(
    () => (currentAudio ? getActivityPosition(currentAudio.activityId) : null),
    [currentAudio],
  );

  if (loading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.listen} scroll={false} header={<PageHeader title="Listen & Choose" />}>
        <View style={styles.center}>
          <PetalMark size={96} loading />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Loading audio guide…
          </Text>
        </View>
      </AppShell>
    );
  }

  if (isComingSoon && currentAudio) {
    return (
      <View style={styles.fill}>
        <ListenComingSoon audio={currentAudio} navigation={navigation} />
        {cfg.guide ? (
          <NavigationGuide screenKey="listen" guideKey="listen" message="Listen carefully!" />
        ) : null}
      </View>
    );
  }

  if (error || !currentAudio) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.listen}
        scroll={false}
        header={<PageHeader title="Listen & Choose" />}
        footer={<SecondaryButton label="Go Back" icon="back" onPress={() => navigation.goBack()} />}
      >
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this audio"
            message={error || 'Audio guide could not be loaded'}
          />
        </View>
      </AppShell>
    );
  }

  /** Mirrors the original tile logic exactly, in the shared vocabulary. */
  const optionState = (opt: string): AnswerOptionState => {
    const isSelected = selectedAnswer === opt;
    const isCorrectAnswer = correctAnswer === opt;

    if (answered) {
      if (isCorrectAnswer) return 'correct';
      if (isSelected) return 'incorrect';
      return 'muted';
    }
    if (isSelected) return 'selected';
    if (selectedAnswer) return 'muted';
    return 'idle';
  };

  const gotItRight = feedback === cfg.praise;

  // ---- Pieces shared by both layouts --------------------------------------

  const header = (
    <ActivityHeader
      kind="listen"
      kindLabel="Listen & Choose"
      title={currentAudio.title || 'Audio Guide'}
      lives={lives}
      steps={position?.total}
      step={position?.index}
      progress={position ? ((position.index + (answered ? 1 : 0)) / position.total) * 100 : undefined}
      progressLabel={position ? `Activity ${position.index + 1} of ${position.total}` : undefined}
    />
  );

  const playSection = (
    <View>
      {cfg.playHeading ? (
        <Text
          style={[typography.presets.eyebrow, styles.playHeading]}
          accessibilityRole="header"
        >
          {cfg.playHeading}
        </Text>
      ) : null}

      <View ref={speakerRef} collapsable={false}>
        <MediaOrb
          icon={isPlaying ? 'sound' : 'listen'}
          label={isPlaying ? cfg.orbActiveLabel : cfg.orbIdleLabel}
          color={colors.blue}
          soft={colors.blueSoft}
          size={cfg.orbSize}
          active={isPlaying}
          onPress={handlePlayPause}
          progress={playProgress * 100}
          note={isComingSoon ? 'Audio coming soon' : undefined}
          reduceMotion={reduceMotion}
          accessibilityLabel={isPlaying ? 'Pause the audio' : 'Play the audio'}
          accessibilityHint="Plays the sound you need to listen to"
          corner={
            cfg.wide ? undefined : (
              <AvatarGlyph
                species={mentor.species}
                size={40}
                accessibilityLabel={`${mentor.name} is listening with you`}
              />
            )
          }
        />
      </View>
    </View>
  );

  const answerSection = (
    <>
      <Text style={[typography.presets.cardTitle, styles.prompt]} accessibilityRole="header">
        {cfg.prompt}
      </Text>

      <AnswerGrid columns={2}>
        {options.map((opt, idx) => (
          <AnswerOption
            key={opt}
            label={opt}
            paletteIndex={idx}
            state={optionState(opt)}
            onPress={answered ? undefined : () => handleOptionPress(opt)}
            disabled={answered}
          />
        ))}
      </AnswerGrid>
    </>
  );

  const footer = (
    <View style={styles.footer}>
      {feedback ? (
        <FeedbackBanner tone={gotItRight ? 'correct' : 'incorrect'} message={feedback} />
      ) : null}

      {!answered ? (
        <View style={styles.actionRow}>
          <View ref={actionBtnRef} collapsable={false} style={styles.actionWide}>
            <PrimaryButton
              label="Check Answer"
              icon="check"
              tone="brand"
              onPress={handleSubmit}
              disabled={!selectedAnswer}
              accessibilityHint="Checks the option you picked"
            />
          </View>
          <View style={styles.actionNarrow}>
            <SecondaryButton
              label="Skip"
              iconRight="forward"
              onPress={handleNextActivity}
              accessibilityHint="Moves on without answering"
            />
          </View>
        </View>
      ) : gotItRight ? (
        <View ref={actionBtnRef} collapsable={false}>
          <PrimaryButton
            label="Next Activity"
            iconRight="forward"
            tone="green"
            onPress={handleNextActivity}
          />
        </View>
      ) : (
        <View style={styles.actionRow}>
          <View ref={actionBtnRef} collapsable={false} style={styles.actionHalf}>
            <PrimaryButton label="Try Again" icon="replay" onPress={handleRetry} />
          </View>
          <View style={styles.actionHalf}>
            <SecondaryButton
              label="Next"
              iconRight="forward"
              tone="green"
              onPress={handleNextActivity}
            />
          </View>
        </View>
      )}
    </View>
  );

  const guide = cfg.guide ? (
    <NavigationGuide
      screenKey="listen"
      guideKey="listen"
      message="Listen carefully!"
      showHand={!!handCoords}
      handMode={answered || selectedAnswer ? 'tap' : 'bounce'}
      handX={handCoords?.x}
      handY={handCoords?.y}
    />
  ) : null;

  // ---- Mobile: one column, sticky actions ---------------------------------

  if (!cfg.wide) {
    return (
      // NavigationGuide has to sit outside AppShell's ScrollView — inside it the
      // absolutely-positioned hand would scroll away from the thing it points at.
      <View style={styles.fill}>
        <AppShell header={header} footer={footer} petals="none" backgroundImage={SCREEN_BACKGROUNDS.listen}>
          {playSection}
          {answerSection}
        </AppShell>
        {guide}
      </View>
    );
  }

  // ---- Tablet / desktop: activity beside a mentor rail --------------------

  return (
    <View style={styles.fill}>
      <AppShell scroll={false} padded={false} header={header} footer={footer} petals="none" backgroundImage={SCREEN_BACKGROUNDS.listen}>
        <View style={styles.layout}>
          <ScrollView
            style={styles.main}
            contentContainerStyle={styles.mainContent}
            showsVerticalScrollIndicator={false}
          >
            {playSection}
            {answerSection}
          </ScrollView>

          <View style={[styles.sidebar, { width: cfg.sidebarWidth }]}>
            <Text style={[typography.presets.cardTitle, styles.sidebarTitle]}>
              {cfg.sidebarTitle}
            </Text>
            <MentorCard
              name={mentor.name}
              species={mentor.species}
              color={mentor.color}
              funFact={mentor.funFact}
              selected
            />
            <Card variant="flat" padding="normal">
              <Text style={[typography.presets.subtle, styles.tip]}>
                {`Hi ${activeChild?.name ?? 'friend'}! Play the sound, then pick the card that matches. You're doing great.`}
              </Text>
            </Card>
          </View>
        </View>
      </AppShell>
      {guide}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  playHeading: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  prompt: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  footer: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionWide: {
    flex: 2,
  },
  actionNarrow: {
    flex: 1,
  },
  actionHalf: {
    flex: 1,
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
  mainContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sidebar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    gap: spacing.md,
  },
  sidebarTitle: {
    color: colors.text,
  },
  tip: {
    color: colors.textSecondary,
    lineHeight: 21,
  },
  comingSoonCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: layoutSizes.reading,
  },
  comingSoonTitle: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  comingSoonBody: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
});

export default ListenContent;
