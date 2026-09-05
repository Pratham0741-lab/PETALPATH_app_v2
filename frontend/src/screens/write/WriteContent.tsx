import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, buttonSizes, cardSizes, starSizes } from '../../theme';
import { useWriteStore } from '../../store/writeStore';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import {
  getActivityPosition,
  getNextActivity,
  navigateToActivity,
} from '../../utils/navigationFlow';
import { getGuidePoints, calculateTracingAccuracy } from '../../utils/tracingAccuracy';
import { scoreActivity } from '../../utils/activityScoring';
import { TracingCanvas } from '../../components/canvas/TracingCanvas';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';
import { ErrorState } from '../../components/common/ErrorState';
import { PetalMark } from '../../components/brand/PetalMark';
import {
  ActivityHeader,
  AppShell,
  AvatarGlyph,
  Card,
  FeedbackBanner,
  MentorCard,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StarRating,
} from '../../components/design';

/**
 * Trace & Draw — reference screen 10 (spec §34 phase 5).
 *
 * One implementation for all three device variants (§28). §20 is the binding
 * constraint here: this stays a real functional SVG tracing interaction, so
 * `TracingCanvas` is rendered exactly as before and every piece of the scoring
 * path is carried across untouched — `getGuidePoints` → `calculateTracingAccuracy`
 * → the `score < 40` retry gate → `getStarsFromScore` → `completeActivity`.
 * That 40-point gate in particular decides whether a child is asked to try
 * again, so it keeps its wording and its `clear()` callback.
 *
 * Variant differences are preserved rather than harmonised where they are
 * behaviour: desktop shipped with no tutorial overlay at all and did not pass
 * `onGuideLayout` to the canvas, so `guide: false` turns both off together. Its
 * "Drawing board:" label and each sidebar's own coaching line are kept too —
 * one of them talks about a finger or stylus, the other about a mouse cursor,
 * and those are genuinely different devices.
 *
 * What changed is the chrome: `AppShell` + `ActivityHeader` replace
 * `ScreenContainer` + `TopBar`, the 🦉 emoji mascot becomes an `AvatarGlyph` of
 * the child's real mentor and the 💖 lives chip becomes the header's
 * `LivesIndicator` (§7), the three-Ionicon star row becomes the shared
 * `StarRating`, the green congratulations pill becomes `FeedbackBanner`, and
 * the four step dots — which were hard-coded and all four lit, on every
 * activity, always — now read the activity's real position in the lesson
 * (§33: no fake UI).
 */

export type WriteVariant = 'mobile' | 'tablet' | 'desktop';

interface WriteVariantConfig {
  /** Two-column layout with a mentor rail beside the board. */
  wide: boolean;
  sidebarWidth: number;
  /** Desktop called the board a board; the others named the task. */
  label: string;
  sidebarTitle: string;
  tip: (name: string) => string;
  /**
   * Whether the tutorial overlay renders — false on desktop, as shipped. This
   * also gates `onGuideLayout`, which desktop never passed to the canvas.
   */
  guide: boolean;
}

const VARIANTS: Record<WriteVariant, WriteVariantConfig> = {
  mobile: {
    wide: false,
    sidebarWidth: 0,
    label: 'Trace the shape:',
    sidebarTitle: '',
    tip: () => '',
    guide: true,
  },
  tablet: {
    wide: true,
    sidebarWidth: 280,
    label: 'Trace the shape:',
    sidebarTitle: 'Write Guide',
    tip: (name) =>
      `Ready to trace, ${name}? Place your finger or stylus on the starting point and draw along the dashed lines. When you're done, hit Check Tracing!`,
    guide: true,
  },
  desktop: {
    wide: true,
    sidebarWidth: 300,
    label: 'Drawing board:',
    sidebarTitle: 'Mentor Guide',
    tip: () =>
      "Fabulous tracing awaits! Click and drag your mouse cursor on the screen to draw. Let's see if we can match the guide line perfectly!",
    // Desktop shipped without the tutorial hand, and without passing
    // `onGuideLayout` to the canvas. Both stay off together.
    guide: false,
  },
};

/** Mobile's coaching line, shown under the prompt instead of in a rail. */
const NARROW_TIP = 'Start from the top and trace slowly along the lines.';

/**
 * ## Why this screen reserves space instead of letting it reflow
 *
 * Pressing Check flips `done`, which swaps the prompt card for the result and
 * mounts the Continue footer. The board is `flex: 1` inside a non-scrolling
 * `AppShell`, so anything that grows around it takes height *from* it — and the
 * canvas freezes its drawing space at first measurement, so a board that changes
 * size makes the child's ink shrink away from the guide it was drawn on. The
 * child's own reading of that is simply "my drawing moved".
 *
 * The two boxes above and below the board therefore hold a constant height
 * across the transition, so `done` costs the board exactly zero pixels and the
 * ink is pixel-stable. Both are `minHeight`, not `height`: a two-line guide name
 * or a scaled font should grow the slot rather than clip it. (Growing costs a
 * one-off resize, which the canvas now survives — it fits, uniformly, rather
 * than re-deriving.)
 */

/**
 * The slot above the board: prompt + coaching line while tracing, the result once
 * Check is pressed. Sized to the taller of the two, which is the result —
 * banner (`spacing.sm + 2` padding twice + a 20pt line) + gap + score card
 * (`cardSizes.padding` twice + a `md` star row with its own `xs` margins + a 20pt
 * accuracy line).
 */
const STATUS_SLOT =
  (spacing.sm + 2) * 2 +
  20 +
  spacing.sm +
  (cardSizes.padding * 2 + starSizes.md + spacing.xs * 2 + 20); // 140

/**
 * Holds the Continue footer's space before the footer exists. `AppShell`'s footer
 * is `spacing.md` above and below a default `md` button, plus its top hairline.
 */
const FOOTER_RESERVE = spacing.md * 2 + 1 + buttonSizes.md.height; // 77

export const WriteContent: React.FC<{ variant: WriteVariant }> = ({ variant }) => {
  const cfg = VARIANTS[variant];
  const navigation = useNavigation<any>();

  const {
    activityId,
    guideName,
    strokes,
    isCompleted,
    accuracyScore,
    stars,
    loading,
    error,
    addStroke,
    undo,
    clear,
    completeActivity,
    lives,
  } = useWriteStore();

  const activeChild = useChildStore((state) => state.activeChild);
  const mentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

  const [answered, setAnswered] = useState(false);

  const nextBtnRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);
  const [traceCoords, setTraceCoords] = useState<
    { startX: number; startY: number; endX: number; endY: number } | undefined
  >(undefined);

  const handleGuideLayout = React.useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      setTraceCoords({ startX, startY, endX, endY });
    },
    [],
  );

  const measureTarget = () => {
    if (answered || isCompleted) {
      if (nextBtnRef.current) {
        nextBtnRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else {
      // Mid-trace the hand follows the guide path, not a button.
      setHandCoords(undefined);
    }
  };

  useEffect(() => {
    const timer = setTimeout(measureTarget, 200);
    return () => clearTimeout(timer);
  }, [answered, isCompleted, traceCoords]);

  const handleCompleteTracing = async (w: number, h: number) => {
    if (strokes.length === 0) {
      Alert.alert('Draw Something First', 'Please trace the guide lines before checking your answer.');
      return;
    }

    const guidePoints = getGuidePoints(guideName, w, h);
    // Raw geometric accuracy drives the retry gate, so leniency never lets a
    // scribble through — only the shown number and stars are softened.
    const rawScore = calculateTracingAccuracy(strokes, guidePoints);

    if (rawScore < 40) {
      Alert.alert(
        "That's not quite right",
        "Let's try again! Try to stay as close as possible to the dashed guidelines.",
        [{ text: 'Try Again', onPress: () => clear() }]
      );
      return;
    }

    // One shared path turns the raw score into the shown accuracy + stars
    // (softened by the honesty level), so the meter and the stars always agree.
    const { accuracy, stars: starsCount } = scoreActivity(rawScore);
    await completeActivity(accuracy, starsCount);
    setAnswered(true);
  };

  const handleNextPress = async () => {
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

  /** Real position in the lesson, replacing the hard-coded four step dots. */
  const position = useMemo(
    () => (activityId ? getActivityPosition(activityId) : null),
    [activityId],
  );

  if (loading) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.trace} scroll={false} header={<PageHeader title="Trace & Draw" />}>
        <View style={styles.center}>
          <PetalMark size={96} loading />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Loading tracing board…
          </Text>
        </View>
      </AppShell>
    );
  }

  if (error || !activityId) {
    return (
      <AppShell petals="none" backgroundImage={SCREEN_BACKGROUNDS.trace}
        scroll={false}
        header={<PageHeader title="Trace & Draw" />}
        footer={<SecondaryButton label="Go Back" icon="back" onPress={() => navigation.goBack()} />}
      >
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this activity"
            message={error || 'Tracing activity could not be loaded'}
          />
        </View>
      </AppShell>
    );
  }

  const done = answered || isCompleted;

  // ---- Pieces shared by both layouts --------------------------------------

  const header = (
    <ActivityHeader
      kind="trace"
      kindLabel="Trace & Draw"
      title={guideName || 'Trace & Draw'}
      backLabel="Back to lesson"
      lives={lives}
      steps={position?.total}
      step={position?.index}
      progress={
        position ? ((position.index + (done ? 1 : 0)) / position.total) * 100 : undefined
      }
      progressLabel={
        position ? `Activity ${position.index + 1} of ${position.total}` : undefined
      }
    />
  );

  const prompt = (
    <Card variant="raised" padding="normal" accent={colors.green} style={styles.promptCard}>
      <View style={styles.mascotCorner} pointerEvents="none">
        <AvatarGlyph
          species={mentor.species}
          size={40}
          accessibilityLabel={`${mentor.name} is drawing with you`}
        />
      </View>
      <Text style={[typography.presets.eyebrow, styles.promptLabel]}>{cfg.label}</Text>
      <Text style={[typography.presets.title, styles.promptName]} numberOfLines={2}>
        {guideName}
      </Text>
    </Card>
  );

  /**
   * The fixed-height slot above the board — see `STATUS_SLOT`. Swapping its
   * contents must not change its size, which is why the board never moves and the
   * ink stays where the child drew it.
   */
  const status = (
    <View style={styles.status}>
      {done ? (
        <>
          <FeedbackBanner tone="correct" message="Tracing complete! Beautiful job!" />
          {accuracyScore !== null ? (
            /* Row, not a stack: the stars and the percentage are one readout, and
               that keeps the card inside the reserved slot. Layout goes on
               `contentStyle` because `Card` wraps children in its own padded view
               — on `style` it would land on the surface and do nothing. */
            <Card variant="flat" padding="normal" contentStyle={styles.scoreCard}>
              <StarRating value={stars ?? 0} max={3} size="md" animate />
              <Text style={[typography.presets.subtle, styles.scoreText]}>
                Accuracy: {accuracyScore}%
              </Text>
            </Card>
          ) : null}
        </>
      ) : (
        <>
          {prompt}
          {!cfg.wide ? (
            <Text style={[typography.presets.caption, styles.tip]}>{NARROW_TIP}</Text>
          ) : null}
        </>
      )}
    </View>
  );

  const board = (
    <View style={styles.board}>
      <TracingCanvas
        guideName={guideName}
        strokes={strokes}
        onAddStroke={addStroke}
        onUndo={undo}
        onClear={clear}
        onComplete={handleCompleteTracing}
        isCompleted={isCompleted}
        onGuideLayout={cfg.guide ? handleGuideLayout : undefined}
      />
    </View>
  );

  // The board's own "Check Tracing" button is the action while tracing, so the
  // footer only appears once there is somewhere to go next — no dead button
  // sitting there disabled for the whole activity (§33).
  const footer = done ? (
    <View ref={nextBtnRef} collapsable={false}>
      <PrimaryButton
        label="Continue"
        iconRight="forward"
        tone="green"
        onPress={handleNextPress}
      />
    </View>
  ) : undefined;

  /** Stands in for the footer's height until the footer itself exists. */
  const footerReserve = footer ? null : <View style={styles.footerReserve} />;

  const guide = cfg.guide ? (
    <NavigationGuide
      screenKey="write"
      guideKey="write"
      message="Trace slowly!"
      showHand={done ? !!handCoords : !!traceCoords}
      handMode={done ? 'tap' : 'move'}
      handX={done ? handCoords?.x : traceCoords?.startX}
      handY={done ? handCoords?.y : traceCoords?.startY}
      handStartX={traceCoords?.startX}
      handStartY={traceCoords?.startY}
      handEndX={traceCoords?.endX}
      handEndY={traceCoords?.endY}
    />
  ) : null;

  // ---- Mobile: one column -------------------------------------------------

  if (!cfg.wide) {
    return (
      // NavigationGuide is absolutely positioned over the whole screen, so it
      // has to sit outside AppShell rather than in its content column.
      <View style={styles.fill}>
        <AppShell scroll={false} header={header} footer={footer} petals="none" backgroundImage={SCREEN_BACKGROUNDS.trace}>
          {status}
          {board}
          {footerReserve}
        </AppShell>
        {guide}
      </View>
    );
  }

  // ---- Tablet / desktop: board beside a mentor rail -----------------------

  return (
    <View style={styles.fill}>
      <AppShell scroll={false} padded={false} header={header} footer={footer} petals="none" backgroundImage={SCREEN_BACKGROUNDS.trace}>
        <View style={styles.layout}>
          <View style={styles.main}>
            {status}
            {board}
            {footerReserve}
          </View>

          <ScrollView
            style={[styles.sidebar, { width: cfg.sidebarWidth }]}
            contentContainerStyle={styles.sidebarContent}
            showsVerticalScrollIndicator={false}
          >
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
              <Text style={[typography.presets.subtle, styles.tipBody]}>
                {cfg.tip(activeChild?.name ?? 'friend')}
              </Text>
            </Card>
          </ScrollView>
        </View>
      </AppShell>
      {guide}
    </View>
  );
};

export default WriteContent;

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

  // ------------------------------------------------------------------ prompt
  promptCard: {
    alignItems: 'center',
  },
  mascotCorner: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  promptLabel: {
    color: colors.leafGreen,
  },
  promptName: {
    color: colors.text,
    textAlign: 'center',
  },

  // ------------------------------------------------------------------- board
  board: {
    flex: 1,
    marginVertical: spacing.md,
  },

  // ---------------------------------------------------- status slot + result
  /**
   * `justifyContent: 'center'` so whichever of the two contents is shorter than
   * the reserved height sits in the middle of it rather than leaving a gap that
   * looks like a mistake.
   */
  status: {
    minHeight: STATUS_SLOT,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  scoreText: {
    color: colors.textSecondary,
  },
  tip: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerReserve: {
    height: FOOTER_RESERVE,
  },

  // ------------------------------------------------------------ wide layout
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sidebar: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  sidebarContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sidebarTitle: {
    color: colors.text,
  },
  tipBody: {
    color: colors.textSecondary,
  },
});
