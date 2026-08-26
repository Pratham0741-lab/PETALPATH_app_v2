/**
 * Mentor Selection (route `'MentorSelection'`) — spec §34 phase 7.
 *
 * The onboarding-side companion chooser, reached from `AddEditChildScreen` with
 * `{ selectedMentorId, returnScreen }` and returning to `returnScreen` with the
 * chosen id. That contract, the `useApiQuery` fetch, the `RefreshControl` and
 * the tap-a-selected-buddy-to-continue shortcut are all unchanged (§1).
 *
 * This is the *detailed* chooser — it shows personality and voice style, which
 * the compact `MentorCard` used in the garden does not — so the card is composed
 * here from shared primitives rather than by adding slots to `MentorCard`. It
 * uses the same `Card` surface, accent rail, `AvatarGlyph` and button sizes, so
 * it still reads as the same family (§28, §33).
 *
 * Replaced along the way: the `Ionicons` avatar (one `paw`-ish glyph per mentor)
 * with each buddy's real face, `checkmark-circle` with `StatusBadge`,
 * `sparkles-outline` / `volume-medium-outline` with `PetalIcon`, the "Choose a
 * Companion 🐾" title emoji, and the `width: '45%'` card grid with cards that
 * flex from a minimum width (§7, §27).
 *
 * The select animation is kept but now skipped when the OS asks for reduced
 * motion, in which case the screen navigates straight away (§30).
 */

import React, { useCallback, useRef } from 'react';
import { ActivityIndicator, Animated, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { useApiQuery } from '../../hooks/useReactQuery';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { queryKeys } from '../../utils/queryKeys';
import { apiClient } from '../../services/api/apiClient';
import { enhanceMentor } from '../../constants/mentors';
import { colors, radius, spacing, typography } from '../../theme';
import type { ApiResponse } from '../../types/api';
import type { OnboardingStackParamList } from '../../types/navigation';
import { EmptyState } from '../../components/common/EmptyState';
import {
  AppShell,
  AvatarGlyph,
  Card,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  SceneBand,
  SecondaryButton,
  StatusBadge,
} from '../../components/design';
import type { PetalIconName } from '../../components/icons';

interface MentorData {
  id: string;
  name: string;
  characterType: string;
  personality: string;
  voiceStyle: string;
  description: string;
  imagePath: string;
}

interface EnhancedMentor extends MentorData {
  color: string;
  iconName: string;
  species: string;
  funFact: string;
}

/** Cards flex from this width, so the column count follows the window (§27). */
const CARD_MIN_WIDTH = 300;
const MAX_CONTENT_WIDTH = 1000;

export const MentorSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'MentorSelection'>>();
  const reduceMotion = useReducedMotion();

  const currentlySelectedId = route.params?.selectedMentorId || null;
  const returnScreen = route.params?.returnScreen || 'AddChild';

  const {
    data: mentorsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useApiQuery(queryKeys.mentors.all, () =>
    apiClient.get<ApiResponse<MentorData[]>>('/mentors'),
  );

  const mentorList: EnhancedMentor[] = (mentorsResponse?.data ?? [])
    .map((m) => enhanceMentor(m))
    .filter(Boolean) as EnhancedMentor[];

  const pulseAnims = useRef<Map<string, Animated.Value>>(new Map()).current;

  const getPulseAnim = useCallback(
    (id: string) => {
      if (!pulseAnims.has(id)) {
        pulseAnims.set(id, new Animated.Value(1));
      }
      return pulseAnims.get(id)!;
    },
    [pulseAnims],
  );

  const handleSelectMentor = useCallback(
    (mentorId: string) => {
      /* Tapping the buddy you already have is "continue", not "choose". */
      if (mentorId === currentlySelectedId || reduceMotion) {
        navigation.navigate(returnScreen, { selectedMentorId: mentorId });
        return;
      }

      const anim = getPulseAnim(mentorId);
      anim.setValue(1);
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1.03, duration: 150, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        navigation.navigate(returnScreen, { selectedMentorId: mentorId });
      });
    },
    [currentlySelectedId, getPulseAnim, navigation, returnScreen, reduceMotion],
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const header = (
    <PageHeader
      title="Choose a Companion"
      subtitle="Pick a learning guide to join your child on their adventures."
    />
  );

  if (isLoading) {
    return (
      <AppShell scroll={false} header={header} petals="light">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Gathering the buddies…
          </Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={header}
      sky
      /*
       * The garden the buddy is being invited into. This screen is often a
       * child's first sight of the app, and it was a page of white cards on a
       * pink field — nothing here said the app is about a garden until several
       * screens later.
       *
       * `progress={null}`: nobody has done anything yet, and the band's flowers
       * mean finished work. Shrubs promise nothing.
       */
      scene={<SceneBand progress={null} height={116} />}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.column}>
        {mentorList.length === 0 ? (
          <EmptyState
            icon="mentors"
            title="No companions available"
            message="Pull down to try again in a moment."
          />
        ) : (
          <View style={styles.grid}>
            {mentorList.map((mentor) => (
              <MentorChoice
                key={mentor.id}
                mentor={mentor}
                selected={currentlySelectedId === mentor.id}
                scale={getPulseAnim(mentor.id)}
                onPress={() => handleSelectMentor(mentor.id)}
              />
            ))}
          </View>
        )}
      </View>
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// One companion
// ---------------------------------------------------------------------------

const MentorChoice: React.FC<{
  mentor: EnhancedMentor;
  selected: boolean;
  scale: Animated.Value;
  onPress: () => void;
}> = ({ mentor, selected, scale, onPress }) => (
  <Animated.View style={[styles.gridItem, { transform: [{ scale }] }]}>
    <Card
      variant={selected ? 'selected' : 'raised'}
      accent={mentor.color}
      rail
      padding="normal"
      onPress={onPress}
      /* `Card` puts children inside its own padded view, so the stack spacing
         has to go on `contentStyle` — on `style` it would only separate the
         accent rail from the body. */
      contentStyle={styles.cardBody}
      accessibilityLabel={`${mentor.name}, ${mentor.characterType}.${selected ? ' Chosen.' : ''}`}
      accessibilityHint={selected ? 'Continue with this buddy' : 'Choose this buddy'}
    >
      <View style={styles.cardHeader}>
        <AvatarGlyph
          species={mentor.species}
          size={56}
          ringColor={selected ? mentor.color : undefined}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={[typography.presets.cardTitle, styles.name]} numberOfLines={1}>
            {mentor.name}
          </Text>
          {/* Same field the old card showed, still shouted — it is the buddy's
              role ("storyteller", "explorer"), which `species` does not cover. */}
          <Text style={[typography.presets.eyebrow, { color: mentor.color }]} numberOfLines={1}>
            {mentor.characterType.toUpperCase()}
          </Text>
        </View>
        {selected ? <StatusBadge status="completed" label="Chosen" size="sm" /> : null}
      </View>

      <Text style={[typography.presets.body, styles.description]}>{mentor.description}</Text>

      <View style={styles.metaBlock}>
        <MetaRow icon="sparkle" label="Personality" value={mentor.personality} />
        <MetaRow icon="sound" label="Voice style" value={mentor.voiceStyle} />
      </View>

      {selected ? (
        <SecondaryButton label="Selected Companion" icon="check" onPress={onPress} />
      ) : (
        <PrimaryButton label="Choose Companion" onPress={onPress} />
      )}
    </Card>
  </Animated.View>
);

const MetaRow: React.FC<{ icon: PetalIconName; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View style={styles.metaRow}>
    <PetalIcon name={icon} size={15} color={colors.textSecondary} />
    <Text style={[typography.presets.caption, styles.metaText]}>
      <Text style={styles.metaLabel}>{label}: </Text>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: CARD_MIN_WIDTH,
  },
  cardBody: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    flexShrink: 0,
  },
  headerText: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
  },
  description: {
    color: colors.text,
  },
  metaBlock: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.cardInner,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.text,
    flexShrink: 1,
  },
  metaLabel: {
    color: colors.textSecondary,
  },
});

export default MentorSelectionScreen;
