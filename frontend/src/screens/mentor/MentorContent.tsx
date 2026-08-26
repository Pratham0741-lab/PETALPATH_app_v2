/**
 * Magical Garden — reference screen 14 (spec §34 phase 7).
 *
 * One implementation for all three device variants. `MentorMobile`,
 * `MentorTablet` and `MentorDesktop` were 252/271/272 lines of near-identical
 * markup, and the differences were drift rather than design:
 *
 *  - Copy: "Choose Your Learning Buddy" / "Meet the Learning Buddies" /
 *    "Your Adventure Companions", and "Fun Fact" / "Description" /
 *    "Role Description" for the same two fields. Unified.
 *  - The watering message was "Splish splash! You watered the tree!" on mobile
 *    and "You watered the tree!" on the other two. Unified on the playful one.
 *  - Mobile showed only the buddy's fun fact; tablet and desktop also showed the
 *    name, species and description. All four are shown now, so nothing is lost
 *    from any variant.
 *
 * One difference was a real *data* bug rather than drift: mobile seeded
 * `petalPoints` from `totalStars` (`totalStars === 0 ? 0 : 12`) and re-synced it
 * when stars changed, while tablet and desktop hardcoded `useState(12)` and
 * never subscribed to the rewards store — so a child with no stars at all was
 * shown 12 petals. Mobile's rule is the only one connected to anything real, so
 * it now applies everywhere. The `12` itself is the shipped placeholder and is
 * left exactly as it was (§1).
 *
 * Behaviour is otherwise untouched: the same `useMentorStore().refreshMentors()`
 * on mount, the same `updateChild(activeChild.id, { mentorId })` on select, and
 * `handleWaterTree` still adds 2 points and clears its message after 3000ms.
 *
 * Layout-wise the two wide variants split into a `flex: 1.2` column beside a
 * `flex: 0.8` / `width: 320` sidebar, with mentor cards at `width: '48%'`. That
 * is the hardcoded-percentage pattern §27 warns about, and it collapsed at
 * in-between widths. There is now one scrolling column whose mentor grid flexes
 * from a minimum card width, so the column count follows the real available
 * width — 1 up on a phone, 2 on a tablet, 3 on a desktop.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { useChildStore } from '../../store/childStore';
import { useMentorStore } from '../../store/mentorStore';
import { useRewardsStore } from '../../store/rewardsStore';
import { enhanceMentor } from '../../constants/mentors';
import { EmptyState } from '../../components/common/EmptyState';
import {
  AppHeader,
  AppShell,
  Card,
  FeedbackBanner,
  MentorCard,
  PetalIcon,
  PrimaryButton,
  RewardBadge,
} from '../../components/design';
import { GardenScene, MAX_BLOSSOMS } from './GardenScene';

export type MentorVariant = 'mobile' | 'tablet' | 'desktop';

const VARIANTS: Record<
  MentorVariant,
  {
    /** Caps the reading column on a wide window. */
    maxWidth?: number;
    /** Minimum mentor-card width; cards grow past it and wrap (§27). */
    cardMinWidth: number;
    sceneHeight: number;
    mascotSize: number;
  }
> = {
  mobile: { cardMinWidth: 260, sceneHeight: 190, mascotSize: 60 },
  tablet: { maxWidth: 900, cardMinWidth: 300, sceneHeight: 220, mascotSize: 68 },
  desktop: { maxWidth: 1120, cardMinWidth: 320, sceneHeight: 240, mascotSize: 76 },
};

/** Petal points a single watering adds — the shipped figure. */
const WATER_REWARD = 2;
/** How long the watering confirmation stays up, unchanged. */
const WATER_MESSAGE_MS = 3000;
/** Petal points per blossom, so the canopy fills as the garden grows. */
const POINTS_PER_BLOSSOM = 4;

export interface MentorContentProps {
  variant: MentorVariant;
}

export const MentorContent: React.FC<MentorContentProps> = ({ variant }) => {
  const cfg = VARIANTS[variant];

  const activeChild = useChildStore((state) => state.activeChild);
  const updateChild = useChildStore((state) => state.updateChild);
  const { mentorList, refreshMentors, loading } = useMentorStore();
  const { totalStars } = useRewardsStore();

  const [petalPoints, setPetalPoints] = useState(totalStars === 0 ? 0 : 12);
  const [wateringMessage, setWateringMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshMentors();
  }, []);

  useEffect(() => {
    setPetalPoints(totalStars === 0 ? 0 : 12);
  }, [totalStars]);

  const activeMentor = activeChild?.mentor ? enhanceMentor(activeChild.mentor) : null;

  const handleSelectMentor = async (mentorId: string) => {
    if (activeChild) {
      try {
        await updateChild(activeChild.id, { mentorId });
      } catch (err) {
        if (__DEV__) console.error('Failed to update companion mentor', err);
      }
    }
  };

  const handleWaterTree = () => {
    setPetalPoints((prev) => prev + WATER_REWARD);
    setWateringMessage(
      `Splish splash! You watered the tree — that is ${WATER_REWARD} more Petal Points!`,
    );
    setTimeout(() => {
      setWateringMessage(null);
    }, WATER_MESSAGE_MS);
  };

  /*
   * No petals pill here. It used to sit in the header's right slot *and* at the
   * top of the garden card immediately below, so the same "12 Petals" appeared
   * twice within about 90px of each other. The garden card is the one that keeps
   * it — that is where "Water the Tree" lives, so the number sits beside the
   * control that changes it. Dropping the duplicate also gives the "Magical
   * Garden" title back roughly 75px of the row it was competing for.
   */
  const header = <AppHeader eyebrow="Your buddies" title="Magical Garden" stars={totalStars} />;

  if (loading && mentorList.length === 0) {
    return (
      <AppShell scroll={false} withBottomNav header={header} petals="light">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Waking up the garden…
          </Text>
        </View>
      </AppShell>
    );
  }

  const blossoms = Math.min(MAX_BLOSSOMS, Math.round(petalPoints / POINTS_PER_BLOSSOM));

  return (
    <AppShell withBottomNav header={header}>
      <View style={[styles.column, cfg.maxWidth ? { maxWidth: cfg.maxWidth } : null]}>
        {/* ---------------------------------------------------------- Garden */}
        <Card variant="raised" padding="normal" accent={colors.leafGreen}>
          <View style={styles.gardenHeader}>
            <RewardBadge kind="petals" value={petalPoints} showUnit />
            <View style={styles.weather}>
              <PetalIcon name="sparkle" size={15} color={colors.yellow} filled />
              <Text style={[typography.presets.caption, styles.weatherText]}>Sunny day</Text>
            </View>
          </View>

          <GardenScene
            species={activeMentor?.species}
            mentorColor={activeMentor?.color || colors.leafGreen}
            blossoms={blossoms}
            height={cfg.sceneHeight}
            mascotSize={cfg.mascotSize}
            accessibilityLabel={
              activeMentor
                ? `Your garden on a sunny day, with ${activeMentor.name} beside a blossom tree carrying ${blossoms} of ${MAX_BLOSSOMS} flowers.`
                : `Your garden on a sunny day, with a blossom tree carrying ${blossoms} of ${MAX_BLOSSOMS} flowers.`
            }
            style={styles.scene}
          />

          {/* Blue, not the old `variant="success"` green: green is the Trace
              activity's identity colour (§15), and water reads blue anyway. */}
          <PrimaryButton
            label="Water the Tree"
            icon="seedling"
            tone="blue"
            onPress={handleWaterTree}
            accessibilityHint={`Adds ${WATER_REWARD} petal points and grows your tree`}
          />

          {wateringMessage ? (
            <FeedbackBanner tone="correct" message={wateringMessage} style={styles.banner} />
          ) : null}
        </Card>

        {/* --------------------------------------------------- Buddy chooser */}
        <View style={styles.sectionHeading}>
          <Text style={[typography.presets.section, styles.sectionTitle]} accessibilityRole="header">
            Choose Your Learning Buddy
          </Text>
          <Text style={[typography.presets.subtle, styles.sectionSubtitle]}>
            Pick a friendly buddy to help you read, write and grow.
          </Text>
        </View>

        {mentorList.length === 0 ? (
          <EmptyState
            icon="mentors"
            title="No buddies yet"
            message="Your learning buddies will appear here in a moment."
          />
        ) : (
          <View style={styles.grid}>
            {mentorList.map((mentor) => (
              <MentorCard
                key={mentor.id}
                name={mentor.name}
                species={mentor.species}
                color={mentor.color}
                funFact={mentor.funFact}
                selected={activeMentor?.id === mentor.id}
                onPress={() => handleSelectMentor(mentor.id)}
                style={[styles.gridItem, { flexBasis: cfg.cardMinWidth }]}
              />
            ))}
          </View>
        )}

        {/* ------------------------------------------------- Selected buddy */}
        {activeMentor ? (
          <Card variant="raised" padding="normal" accent={activeMentor.color} rail>
            <Text style={[typography.presets.eyebrow, { color: activeMentor.color }]}>
              Your buddy
            </Text>
            <Text style={[typography.presets.section, styles.buddyName]}>{activeMentor.name}</Text>
            <Text style={[typography.presets.caption, styles.buddySpecies]}>
              {activeMentor.species}
            </Text>

            <View style={styles.buddyDivider} />

            <Text style={[typography.presets.eyebrow, styles.buddyLabel]}>
              Fun fact from {activeMentor.name.split(' ')[0]}
            </Text>
            <Text style={[typography.presets.body, styles.buddyText]}>{activeMentor.funFact}</Text>

            {activeMentor.description ? (
              <>
                <Text style={[typography.presets.eyebrow, styles.buddyLabel]}>About</Text>
                <Text style={[typography.presets.body, styles.buddyText]}>
                  {activeMentor.description}
                </Text>
              </>
            ) : null}
          </Card>
        ) : (
          <Card variant="muted" padding="normal">
            <Text style={[typography.presets.body, styles.buddyEmpty]}>
              No buddy chosen yet — tap one above and they will join you in the garden.
            </Text>
          </Card>
        )}
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignSelf: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
  },

  // ---------------------------------------------------------------- Garden
  gardenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weatherText: {
    color: colors.textSecondary,
  },
  scene: {
    marginVertical: spacing.md,
  },
  banner: {
    marginTop: spacing.md,
  },

  // --------------------------------------------------------- Buddy chooser
  sectionHeading: {
    gap: 2,
  },
  sectionTitle: {
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    flexGrow: 1,
    flexShrink: 1,
  },

  // -------------------------------------------------------- Selected buddy
  buddyName: {
    color: colors.text,
    marginTop: 2,
  },
  buddySpecies: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  buddyDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  buddyLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  buddyText: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  buddyEmpty: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default MentorContent;
