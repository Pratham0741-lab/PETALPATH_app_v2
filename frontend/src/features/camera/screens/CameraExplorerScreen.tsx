/**
 * Camera Activities — reference screen 13 (spec §34 phase 7).
 *
 * A restyle only: every catalog rule and both navigations are the originals
 * (§1, §23). The pose engine is reached exactly as before — `CameraActivityLesson`
 * with `les_cam_<id>` and the mapped `activityType`, and `Calibration` through
 * `navigation.getParent()` — so nothing here becomes a mockup.
 *
 * What changed is the surface. The dark `#3B342F` banner (the one screen in the
 * app with a brown card on a pink background) is now a warm white card with the
 * camera identity blue on its rail; the two emoji-in-label buttons lost their 🎯
 * and 📷 (§7); the Ionicons `camera`/`star`/`repeat`/`time-outline` are
 * `PetalIcon`s; the hand-mixed `rgba(139,120,216,0.15)` and
 * `rgba(247,215,78,0.2)` badges are the shared `RewardBadge`; and the category
 * chips, which were this screen's own private markup, are now the shared
 * `SegmentedTabs` in its scrolling layout — the same switcher My Rewards uses
 * (§28).
 *
 * Two small content fixes rather than faithful copies of a bug:
 *
 *  - The banner greeted every child as if their mentor were Penny Panda. It now
 *    uses the child's actual companion, and drops the name entirely when there
 *    isn't one.
 *  - A category with no matches used to render an empty page under a "(0)"
 *    heading. It now says so, and offers the way back to everything.
 *
 * The category pills deliberately carry no icons. "Body Movements" and "Upper
 * Body" have no honest glyph in the set, and an invented one would be worse than
 * the plain word (§7) — the labels are unambiguous on their own.
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EmptyState } from '../../../components/common/EmptyState';
import {
  AppHeader,
  AppShell,
  Card,
  IconWell,
  PetalIcon,
  PrimaryButton,
  RewardBadge,
  SceneBand,
  SecondaryButton,
  SegmentedTabs,
  type SegmentedTabItem,
} from '../../../components/design';
import { useDeviceType } from '../../../hooks/useDeviceType';
import { useChildStore } from '../../../store/childStore';
import {
  cardSizes,
  colors,
  getActivityColor,
  spacing,
  typography,
} from '../../../theme';
import catalogData from '../catalog/activities.generated.json';

interface CameraActivityItem {
  id: string;
  title: string;
  description: string;
  validatorName: string;
  category: string;
  repetitions: number;
  holdDuration: number;
  difficulty: string;
  instruction: string;
  reward: {
    stars: number;
    xp: number;
  };
}

type CategoryId = 'all' | 'body_movements' | 'upper_body' | 'balance';

/** Unchanged from the original — ids drive the filter below. */
const CATEGORIES: SegmentedTabItem<CategoryId>[] = [
  { key: 'all', label: 'All Activities' },
  { key: 'body_movements', label: 'Body Movements' },
  { key: 'upper_body', label: 'Upper Body' },
  { key: 'balance', label: 'Balance & Focus' },
];

/** Cards flex from this width, so the column count follows the window (§27). */
const CARD_MIN_WIDTH: Record<string, number> = {
  mobile: 280,
  tablet: 300,
  desktop: 320,
};

const COLUMN_MAX_WIDTH: Record<string, number | undefined> = {
  mobile: undefined,
  tablet: 900,
  desktop: 1120,
};

/**
 * The word is always shown as well as the colour, so difficulty never depends on
 * hue alone (§30). Unknown values fall back to plain secondary text.
 */
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: colors.leafGreen,
  beginner: colors.leafGreen,
  medium: colors.orange,
  intermediate: colors.orange,
  hard: colors.primary,
  advanced: colors.primary,
};

/**
 * Maps a catalog validator onto the coarse `ActivityType` union.
 *
 * `activityType` is still needed for analytics, the sync payload and the eight
 * built-in labels, but it is no longer what decides whether the pose was done —
 * `validatorName` travels alongside it and the engine uses that.
 *
 * This replaces two substring tests that produced only `touch_head` or
 * `raise_hands`, and produced `raise_hands` for 95 of the 97 activities: every
 * validator containing "Hands" matched, `isHandNearKnees` said "Hand" not
 * "Hands" so it fell to the default, and wave, jump and hug fell there too. That
 * is why "Sit down", "Freeze" and "Touch toes" all asked the child to raise their
 * hands.
 */
const ACTIVITY_TYPE_BY_VALIDATOR: Record<string, string> = {
  areHandsAboveShoulders: 'raise_hands',
  areBothHandsAboveShoulders: 'raise_hands',
  isLeftHandRaised: 'raise_hands',
  isRightHandRaised: 'raise_hands',
  areHandsBelowHips: 'hands_on_hips',
  areArmsExtendedSideways: 'raise_hands',
  isHandNearHead: 'touch_head',
  areHandsNearFace: 'touch_head',
  areHandsNearShoulders: 'touch_head',
  isHandNearTorso: 'hands_on_hips',
  isHandNearKnees: 'touch_knees',
  areHandsNearAnkles: 'touch_knees',
  areHandsNearHips: 'hands_on_hips',
  areHandsTouching: 'clap',
  isArmCrossedAcrossTorso: 'hug_yourself',
  areHandsForward: 'raise_hands',
  areHandsBehindBack: 'hug_yourself',
  isSquatting: 'touch_knees',
  isStandingUpright: 'raise_hands',
  isStarPose: 'raise_hands',
  isHandMovingHorizontally: 'wave',
  isBodyMovingVertically: 'jump',
  isMarchingInPlace: 'jump',
  isBodyRotating: 'jump',
  isSteppingSideways: 'jump',
  isHeadNoddingVertically: 'touch_head',
  isHeadShakingHorizontally: 'touch_head',
  isBodyStill: 'raise_hands',
  isBodyWiggling: 'jump',
  isChildParticipating: 'raise_hands',
};

/**
 * Which validators each category chip shows.
 *
 * The chips previously filtered on `validatorName.includes('hand')` and
 * `includes('balance') || includes('leg')`. No validator has ever contained
 * "balance" or "leg", so "Balance & Focus" was permanently empty, and "hand"
 * matched almost everything. These are explicit sets against the real names.
 */
const UPPER_BODY_VALIDATORS = new Set([
  'areHandsAboveShoulders',
  'areBothHandsAboveShoulders',
  'isLeftHandRaised',
  'isRightHandRaised',
  'areHandsBelowHips',
  'areArmsExtendedSideways',
  'isHandNearHead',
  'areHandsNearFace',
  'areHandsNearShoulders',
  'isHandNearTorso',
  'areHandsNearHips',
  'areHandsTouching',
  'isArmCrossedAcrossTorso',
  'areHandsForward',
  'areHandsBehindBack',
  'isHandMovingHorizontally',
  'isHeadNoddingVertically',
  'isHeadShakingHorizontally',
]);

const BALANCE_VALIDATORS = new Set([
  'isStandingUpright',
  'isStarPose',
  'isSquatting',
  'isBodyStill',
  'isBodyRotating',
  'isSteppingSideways',
  'isMarchingInPlace',
  'areHandsNearAnkles',
]);

export const CameraExplorerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();
  const activeChild = useChildStore((state) => state.activeChild);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');

  const tone = getActivityColor('camera');

  // Filter out meta entries and get valid camera activities
  const allActivities: CameraActivityItem[] = useMemo(
    () =>
      (catalogData.activities as any[]).filter(
        (act) => act.id !== 'petalpath_real_time_camera_based_activities_mvp' && act.id !== 'lesson'
      ),
    []
  );

  const filteredActivities = useMemo(
    () =>
      allActivities.filter((act) => {
        if (selectedCategory === 'all') return true;
        if (selectedCategory === 'body_movements') return act.category === 'body_movements';
        if (selectedCategory === 'upper_body') return UPPER_BODY_VALIDATORS.has(act.validatorName);
        if (selectedCategory === 'balance') return BALANCE_VALIDATORS.has(act.validatorName);
        return true;
      }),
    [allActivities, selectedCategory]
  );

  const handleStartActivity = (act: CameraActivityItem) => {
    /**
     * `validatorName` is the payload that matters: it is the primitive the pose
     * engine will actually run. `activityType` is kept for the analytics event and
     * the session's coarse bucketing, but it no longer decides success.
     */
    const poseType = ACTIVITY_TYPE_BY_VALIDATOR[act.validatorName] ?? 'raise_hands';

    const targetNav = navigation.getParent() || navigation;
    targetNav.navigate('CameraActivityLesson', {
      lessonId: `les_cam_${act.id}`,
      activityId: act.id,
      activityType: poseType,
      validatorName: act.validatorName,
    });
  };

  const handleCalibrate = () => {
    const targetNav = navigation.getParent() || navigation;
    targetNav.navigate('Calibration');
  };

  const companion = activeChild?.mentor?.name?.split(' ')[0];
  const maxWidth = COLUMN_MAX_WIDTH[deviceType];
  const cardMinWidth = CARD_MIN_WIDTH[deviceType] ?? CARD_MIN_WIDTH.mobile;

  return (
    <AppShell
      withBottomNav
      petals="light"
      sky
      /*
       * Somewhere to be, rather than somewhere to get to. The reference sets its
       * camera activities in a garden, and this screen needs it more than most:
       * the child is about to stand up and move, and a screen that ends in blank
       * background under a grid of cards reads like a settings list.
       *
       * `progress={null}` on purpose. The band's flowers mean completed work
       * everywhere else in the app, and camera completions live in an
       * AsyncStorage sync queue that is emptied as it uploads — it is a transport,
       * not a score. Rather than draw a number this screen cannot stand behind,
       * the garden here is planted with shrubs and claims nothing.
       */
      scene={<SceneBand progress={null} height={116} />}
      header={<AppHeader eyebrow="Move and play" title="Camera Activities" />}
    >
      <View style={[styles.column, maxWidth ? { maxWidth } : null]}>
        {/* ---------------------------------------------------------- Intro */}
        <Card variant="raised" padding="normal" accent={tone.main} rail contentStyle={styles.intro}>
          <View style={styles.introRow}>
            <IconWell
              icon="camera"
              color={tone.main}
              soft={tone.soft}
              size={cardSizes.iconWellLarge}
              filled
            />
            <View style={styles.introText}>
              <Text style={typography.presets.section} numberOfLines={2}>
                Interactive Motion &amp; Pose
              </Text>
              <Text style={[typography.presets.body, styles.muted]}>
                {companion
                  ? `Use your camera to do fun physical exercises with ${companion}!`
                  : 'Use your camera to do fun physical exercises!'}
              </Text>
            </View>
          </View>

          <SecondaryButton
            label="Calibrate Camera Position"
            icon="settings"
            tone="blue"
            onPress={handleCalibrate}
            accessibilityHint="Helps the camera find your whole body before you start"
          />
        </Card>

        {/* ------------------------------------------------------ Categories */}
        <SegmentedTabs
          items={CATEGORIES}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          layout="scroll"
          accessibilityLabel="Activity categories"
        />

        {/* ------------------------------------------------------ Challenges */}
        <View style={styles.sectionRow}>
          <Text style={typography.presets.section}>Motion Challenges</Text>
          <Text style={[typography.presets.caption, styles.muted]}>
            {filteredActivities.length} available
          </Text>
        </View>

        {filteredActivities.length === 0 ? (
          /* `EmptyState` is `flex: 1`, which resolves to nothing inside a
             scroll view's auto-height content — the wrapper's `minHeight` is
             what gives it room to centre in. */
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="camera"
              title="Nothing in this group yet"
              message="Pick another group to see more motion challenges."
            />
            <PrimaryButton
              label="Show all activities"
              onPress={() => setSelectedCategory('all')}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredActivities.map((act) => (
              <MotionChallengeCard
                key={act.id}
                activity={act}
                minWidth={cardMinWidth}
                onStart={() => handleStartActivity(act)}
              />
            ))}
          </View>
        )}
      </View>
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// One challenge, one card
// ---------------------------------------------------------------------------

const MotionChallengeCard: React.FC<{
  activity: CameraActivityItem;
  minWidth: number;
  onStart: () => void;
}> = ({ activity, minWidth, onStart }) => {
  const tone = getActivityColor('camera');
  const difficultyColor =
    DIFFICULTY_COLOR[activity.difficulty?.toLowerCase()] ?? colors.textSecondary;

  return (
    /* The card itself is not pressable: the Start button is the one control, so
       there is no invisible second way to launch the same activity (§33). */
    <Card
      variant="raised"
      padding="normal"
      accent={tone.main}
      rail
      style={[styles.gridItem, { flexBasis: minWidth }]}
      contentStyle={styles.card}
    >
      <View style={styles.cardHead}>
        <IconWell
          icon="camera"
          color={tone.main}
          soft={tone.soft}
          size={cardSizes.iconWellSmall}
        />
        <View style={styles.cardHeadText}>
          <Text style={[typography.presets.eyebrow, { color: difficultyColor }]} numberOfLines={1}>
            {activity.difficulty}
          </Text>
          <Text style={typography.presets.cardTitle} numberOfLines={2}>
            {activity.title}
          </Text>
        </View>
      </View>

      <Text style={[typography.presets.body, styles.muted]} numberOfLines={3}>
        {activity.instruction}
      </Text>

      <View style={styles.metaRow}>
        <Meta icon="replay" label={`${activity.repetitions} reps`} />
        <Meta icon="clock" label={`${(activity.holdDuration / 1000).toFixed(1)}s hold`} />
      </View>

      <View style={styles.rewardRow}>
        <RewardBadge kind="stars" value={activity.reward.stars} signed showUnit size="sm" />
        <RewardBadge kind="xp" value={activity.reward.xp} signed showUnit size="sm" />
      </View>

      <PrimaryButton
        label="Start Activity"
        icon="camera"
        onPress={onStart}
        accessibilityLabel={`Start ${activity.title}`}
      />
    </Card>
  );
};

const Meta: React.FC<{ icon: 'replay' | 'clock'; label: string }> = ({ icon, label }) => (
  <View style={styles.metaItem}>
    <PetalIcon name={icon} size={16} color={colors.textSecondary} />
    <Text style={[typography.presets.caption, styles.muted]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  intro: {
    gap: spacing.md,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  introText: {
    flex: 1,
    gap: 2,
  },
  muted: {
    color: colors.textSecondary,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    /* The heading belongs to the grid below it, not to the chips above. */
    marginBottom: -spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: cardSizes.gap,
  },
  gridItem: {
    flexGrow: 1,
    flexShrink: 1,
  },
  card: {
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardHeadText: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  emptyWrap: {
    minHeight: 300,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  emptyButton: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 280,
  },
});

export default CameraExplorerScreen;
