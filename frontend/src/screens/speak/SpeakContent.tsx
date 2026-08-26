import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, cardSizes, MediaOrbSizeToken, layoutSizes } from '../../theme';
import { useSpeakStore } from '../../store/speakStore';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { UniversalSpeechRecognizer } from '../../utils/speechRecognition';
import {
  getActivityPosition,
  getNextActivity,
  navigateToActivity,
} from '../../utils/navigationFlow';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';
import { ErrorState } from '../../components/common/ErrorState';
import {
  ActivityHeader,
  AppShell,
  AvatarGlyph,
  Card,
  FeedbackBanner,
  IconWell,
  MediaOrb,
  MentorCard,
  PageHeader,
  PrimaryButton,
  ProgressIndicator,
  SecondaryButton,
  SoundWave,
  StarRating,
} from '../../components/design';

/**
 * Speak & Learn — reference screen 8 (spec §34 phase 5).
 *
 * One implementation for all three device variants (§28). The originals were
 * the same screen three times over, differing only in the sidebar, some copy
 * and — on desktop — the absence of the tutorial hand, so `VARIANTS` names
 * exactly those differences. Desktop still has no hand: that omission is
 * existing behaviour, not something to "fix" inside a redesign (§1).
 *
 * The speech pipeline is untouched. `UniversalSpeechRecognizer` is still
 * constructed once and `stop()`ed on unmount, `handleMicPress` still starts and
 * stops it the same way, `stopRecording(transcript, confidence)` still decides
 * success, and every one of the five friendly error messages is preserved
 * verbatim including the offline hint that names "Skip / Demo Mode".
 *
 * What changed: the mic becomes the shared `MediaOrb` (purple, because §15
 * gives SPEAK purple), the never-animating seven-bar waveform becomes the real
 * `SoundWave`, the hand-rolled confidence meter becomes `ProgressIndicator`,
 * the Ionicons star row becomes `StarRating`, the 🦉 emoji mascot becomes an
 * `AvatarGlyph` of the child's actual mentor (§7), and the four fake step dots
 * become the activity's real position in the lesson (§33).
 */

export type SpeakVariant = 'mobile' | 'tablet' | 'desktop';

interface SpeakVariantConfig {
  wide: boolean;
  sidebarWidth: number;
  orbSize: MediaOrbSizeToken;
  /** Instruction shown before the child has recorded anything. */
  instruction: string;
  /** Desktop titled its recording area; the narrower variants don't need to. */
  studioHeading?: string;
  sidebarTitle: string;
  /** In-character encouragement from the mentor, shown in the rail. */
  tip: (name: string) => string;
  /** Whether the tutorial overlay renders at all — false on desktop, as shipped. */
  guide: boolean;
}

const VARIANTS: Record<SpeakVariant, SpeakVariantConfig> = {
  mobile: {
    wide: false,
    sidebarWidth: 0,
    orbSize: 'lg',
    instruction: 'Tap the microphone and read the phrase clearly.',
    sidebarTitle: '',
    tip: () => '',
    guide: true,
  },
  tablet: {
    wide: true,
    sidebarWidth: 280,
    orbSize: 'lg',
    instruction: 'Tap the microphone and read the phrase clearly.',
    sidebarTitle: 'Mascot Buddy',
    tip: (name) => `Hi ${name}! Tap the mic and read the phrase aloud so I can listen. I know you can do it.`,
    guide: true,
  },
  desktop: {
    wide: true,
    sidebarWidth: 320,
    orbSize: 'lg',
    instruction: 'Click the microphone button when you are ready to practice speaking.',
    studioHeading: 'Microphone Studio',
    sidebarTitle: 'Mentor Guide',
    tip: (name) =>
      `Speaking time is my favourite, ${name}! Clear your throat, click the big mic, and say the phrase. Let's see how close to 100% you can get.`,
    guide: false,
  },
};

/** Confidence at or above this counts as a good match — the store's own rule. */
const GOOD_MATCH = 70;

// ---------------------------------------------------------------------------
// Coming-soon variant
// ---------------------------------------------------------------------------

const SpeakComingSoon: React.FC<{
  activityId: string;
  activityTitle: string;
  navigation: any;
}> = ({ activityId, activityTitle, navigation }) => {
  const { completeActivity } = useSpeakStore();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleProceed = async () => {
    setIsCompleting(true);
    try {
      await completeActivity(100);
      const next = getNextActivity(activityId);
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
    <AppShell
      scroll={false}
      header={<PageHeader title={activityTitle || 'Speak Activity'} />}
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
        <Card variant="raised" padding="roomy" accent={colors.purple} style={styles.comingSoonCard}>
          <IconWell
            icon="microphone"
            color={colors.purple}
            soft={colors.secondaryLight}
            size={cardSizes.iconWellLarge}
          />
          <Text style={[typography.presets.section, styles.comingSoonTitle]}>
            Speaking Practice Coming Soon
          </Text>
          <Text style={[typography.presets.body, styles.comingSoonBody]}>
            Our team is preparing a magical voice-recording practice for this lesson.
          </Text>
          <Text style={[typography.presets.caption, styles.comingSoonBody]}>
            You don't have to wait — tap the button below to move on to the next activity.
          </Text>
        </Card>
      </View>
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// Speak & Learn
// ---------------------------------------------------------------------------

export const SpeakContent: React.FC<{ variant?: SpeakVariant }> = ({ variant = 'mobile' }) => {
  const cfg = VARIANTS[variant];
  const navigation = useNavigation<any>();
  const {
    activityId,
    targetPhrase,
    transcript,
    confidence,
    stars,
    isCompleted,
    loading,
    error,
    startRecording,
    stopRecording,
    retry,
    completeActivity,
    lives,
    isComingSoon,
  } = useSpeakStore();

  const [recognizer, setRecognizer] = useState<UniversalSpeechRecognizer | null>(null);
  const [localRecording, setLocalRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reduceMotion = useReducedMotion();
  const activeChild = useChildStore((state) => state.activeChild);
  const mentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

  const micRef = useRef<View>(null);
  const actionBtnRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);

  const measureTarget = () => {
    // Desktop never showed the hand, so there is nothing to point at.
    if (!cfg.guide) return;

    if (isCompleted) {
      if (actionBtnRef.current) {
        actionBtnRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else if (!localRecording) {
      if (micRef.current) {
        micRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else {
      // Mid-recording the child is already doing the right thing — no hand.
      setHandCoords(undefined);
    }
  };

  useEffect(() => {
    const timer = setTimeout(measureTarget, 200);
    return () => clearTimeout(timer);
  }, [isCompleted, localRecording, activityId]);

  useEffect(() => {
    const rec = new UniversalSpeechRecognizer();
    setRecognizer(rec);

    return () => {
      rec.stop();
    };
  }, []);

  const handleMicPress = () => {
    if (!recognizer) return;

    if (localRecording) {
      recognizer.stop();
      setLocalRecording(false);
    } else {
      startRecording();
      setLocalRecording(true);
      setErrorMessage(null);

      recognizer.start(
        async (res) => {
          setLocalRecording(false);
          const success = await stopRecording(res.transcript, res.confidence);
          if (!success) {
            setErrorMessage("That's not quite right, let's try again!");
            retry();
          }
        },
        (err) => {
          if (__DEV__) console.warn('Speech recognition error:', err);
          setLocalRecording(false);

          let friendlyMsg = 'Speech recognition failed.';
          if (err?.message) {
            if (err.message.includes('no-speech')) {
              friendlyMsg = "We didn't hear anything. Please tap the mic and try again!";
            } else if (err.message.includes('not-allowed') || err.message.includes('Permission')) {
              friendlyMsg = 'Microphone permission not granted. Please allow it in settings.';
            } else if (err.message.includes('busy')) {
              friendlyMsg = 'Speech recognizer is busy. Please try again in a moment.';
            } else if (err.message.includes('network')) {
              friendlyMsg =
                "Network connection issue. Please make sure your device/emulator has internet access, or use 'Skip / Demo Mode' if testing offline.";
            } else {
              friendlyMsg = err.message;
            }
          }
          setErrorMessage(friendlyMsg);
          retry();
        }
      );
    }
  };

  const handleNextActivity = async () => {
    if (!activityId) return;
    const next = getNextActivity(activityId);
    if (next) {
      await navigateToActivity(navigation, next);
    } else if (next === null) {
      navigation.navigate('LessonComplete');
    } else {
      navigation.navigate('LessonOverview');
    }
  };

  const handleSkipOrForceComplete = async () => {
    await completeActivity(90);
  };

  /** Real position in the lesson, replacing the hard-coded four step dots. */
  const position = useMemo(
    () => (activityId ? getActivityPosition(activityId) : null),
    [activityId],
  );

  if (loading) {
    return (
      <AppShell scroll={false} header={<PageHeader title="Speak & Learn" />}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Loading speaking practice…
          </Text>
        </View>
      </AppShell>
    );
  }

  if (isComingSoon) {
    return (
      <SpeakComingSoon
        activityId={activityId || 'placeholder-id'}
        activityTitle="Speak & Learn"
        navigation={navigation}
      />
    );
  }

  if (error || !activityId) {
    return (
      <AppShell
        scroll={false}
        header={<PageHeader title="Speak & Learn" />}
        footer={<SecondaryButton label="Go Back" icon="back" onPress={() => navigation.goBack()} />}
      >
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this activity"
            message={error || 'Speak activity could not be loaded'}
          />
        </View>
      </AppShell>
    );
  }

  // ---- Pieces shared by both layouts --------------------------------------

  const header = (
    <ActivityHeader
      kind="speak"
      kindLabel="Speak & Learn"
      title={targetPhrase ? `Say "${targetPhrase}"` : 'Speak & Learn'}
      lives={lives}
      steps={position?.total}
      step={position?.index}
      progress={
        position ? ((position.index + (isCompleted ? 1 : 0)) / position.total) * 100 : undefined
      }
      progressLabel={position ? `Activity ${position.index + 1} of ${position.total}` : undefined}
    />
  );

  /** The phrase to read aloud — the one thing on the screen that must be big. */
  const phraseCard = (
    <Card variant="raised" padding="roomy" accent={colors.purple} style={styles.phraseCard}>
      <View style={styles.mascotCorner}>
        <AvatarGlyph
          species={mentor.species}
          size={44}
          accessibilityLabel={`${mentor.name} is listening to you`}
        />
      </View>

      <Text style={[typography.presets.eyebrow, styles.sayLabel]}>Say out loud</Text>
      <Text style={[typography.presets.display, styles.phrase]} accessibilityRole="header">
        {targetPhrase}
      </Text>
    </Card>
  );

  /**
   * One slot that shows whichever of the four states applies. Keeping it a
   * single block preserves the original's precedence — recording beats a
   * result, a result beats an error, an error beats the instruction.
   */
  const statusPanel = (
    <View style={styles.statusPanel}>
      {localRecording ? (
        <View style={styles.recordingBlock}>
          <SoundWave active color={colors.purple} />
          <Text style={[typography.presets.subtle, styles.listening]} accessibilityLiveRegion="polite">
            Listening closely…
          </Text>
        </View>
      ) : transcript ? (
        <Card variant="flat" padding="normal" style={styles.resultCard}>
          <Text style={[typography.presets.eyebrow, styles.resultLabel]}>You said</Text>
          <Text style={[typography.presets.cardTitle, styles.transcript]}>“{transcript}”</Text>

          <ProgressIndicator
            value={confidence}
            color={confidence >= GOOD_MATCH ? colors.green : colors.orange}
            label="Match confidence"
            showPercentage
            style={styles.meter}
            accessibilityLabel={`Match confidence ${Math.round(confidence)} percent`}
          />

          {stars !== null ? <StarRating value={stars ?? 0} max={3} size="md" animate /> : null}
        </Card>
      ) : errorMessage ? (
        <FeedbackBanner tone="incorrect" message={errorMessage} />
      ) : (
        <Text style={[typography.presets.body, styles.instruction]}>{cfg.instruction}</Text>
      )}
    </View>
  );

  const micSection = (
    <View>
      {cfg.studioHeading ? (
        <Text style={[typography.presets.eyebrow, styles.studioHeading]} accessibilityRole="header">
          {cfg.studioHeading}
        </Text>
      ) : null}

      <View ref={micRef} collapsable={false}>
        <MediaOrb
          icon={localRecording ? 'pause' : 'microphone'}
          label={localRecording ? 'Tap to Stop' : 'Tap to Speak'}
          color={localRecording ? colors.coral : colors.purple}
          soft={localRecording ? colors.errorLight : colors.secondaryLight}
          size={cfg.orbSize}
          active={localRecording}
          onPress={handleMicPress}
          reduceMotion={reduceMotion}
          accessibilityLabel={localRecording ? 'Stop recording' : 'Start recording'}
          accessibilityHint="Records you saying the phrase above"
        />
      </View>
    </View>
  );

  const footer = isCompleted ? (
    <View ref={actionBtnRef} collapsable={false}>
      <PrimaryButton
        label="Next Activity"
        iconRight="forward"
        tone="green"
        onPress={handleNextActivity}
      />
    </View>
  ) : (
    // Demo mode is a real escape hatch for offline testing, so it stays a real
    // button rather than the underlined pseudo-link it used to be (§33) — but
    // narrow and small, because skipping is not the path we want to advertise.
    <View style={styles.skipRow}>
      <SecondaryButton
        label="Skip / Demo Mode"
        iconRight="forward"
        size="sm"
        fullWidth={false}
        onPress={handleSkipOrForceComplete}
        accessibilityHint="Marks this activity complete without recording"
      />
    </View>
  );

  const guide = cfg.guide ? (
    <NavigationGuide
      screenKey="speak"
      guideKey="speak"
      message="Say it out loud!"
      showHand={!!handCoords}
      handMode={isCompleted ? 'tap' : 'bounce'}
      handX={handCoords?.x}
      handY={handCoords?.y}
    />
  ) : null;

  // ---- Mobile: one column, sticky action ----------------------------------

  if (!cfg.wide) {
    return (
      // NavigationGuide has to sit outside AppShell's ScrollView — inside it the
      // absolutely-positioned hand would scroll away from the thing it points at.
      <View style={styles.fill}>
        <AppShell header={header} footer={footer}>
          {phraseCard}
          {statusPanel}
          <View style={styles.micArea}>{micSection}</View>
        </AppShell>
        {guide}
      </View>
    );
  }

  // ---- Tablet / desktop: practice beside a mentor rail --------------------

  return (
    <View style={styles.fill}>
      <AppShell scroll={false} padded={false} header={header} footer={footer}>
        <View style={styles.layout}>
          <ScrollView
            style={styles.main}
            contentContainerStyle={styles.mainContent}
            showsVerticalScrollIndicator={false}
          >
            {phraseCard}
            {statusPanel}
            <View style={styles.micArea}>{micSection}</View>
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
                {cfg.tip(activeChild?.name ?? 'friend')}
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
  phraseCard: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  mascotCorner: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  sayLabel: {
    color: colors.purple,
    marginBottom: spacing.xs,
  },
  phrase: {
    color: colors.text,
    textAlign: 'center',
  },
  statusPanel: {
    minHeight: 128,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  recordingBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  listening: {
    color: colors.purple,
  },
  resultCard: {
    alignItems: 'center',
  },
  resultLabel: {
    color: colors.textSecondary,
  },
  transcript: {
    color: colors.text,
    textAlign: 'center',
    marginTop: 2,
  },
  meter: {
    width: '100%',
    marginTop: spacing.sm,
  },
  instruction: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  studioHeading: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  micArea: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  skipRow: {
    alignItems: 'center',
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

export default SpeakContent;
