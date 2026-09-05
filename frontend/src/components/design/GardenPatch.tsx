import React, { useMemo } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import { getSubjectEmblem } from '../../assets/subjects';
import type { GardenSkill } from '../../types/garden';
import { PetalIcon } from '../icons';
import { Card } from './Card';
import { IconWell } from './Cards';
import { SkillBloom, BLOOM_STAGE_ORDER } from './SkillBloom';
import { getSubjectVisual } from './subjectVisuals';

/**
 * GardenPatch — one subject drawn as a patch of ground in the "Your Garden"
 * panorama (the reworked Explore tab).
 *
 * The old Explore card was a text row: "12 skills · 3 completed" over a purple
 * bar. A five-year-old cannot read that. This patch says the same thing in
 * flowers — a strip of the subject's own blooms at their real stages — so the
 * child sees how grown a patch is, and a parent sees at a glance which patch
 * needs attention. Tapping it opens the focused subject screen.
 *
 * Every judgement here is the backend's: each flower's `stage`, whether it
 * `needsWater`, and the patch's `growthPercent` all arrive already computed from
 * the child's *live* (decayed) mastery, so the panorama can never drift from the
 * roadmap or re-introduce the band-order trap. This component only arranges what
 * it is handed.
 *
 * Distinct from Home, which is "the path" (a roadmap ribbon): the garden is a
 * place, laid out as patches, not a journey laid out as steps.
 */

/** How many blooms the summary strip shows before collapsing the rest into "+N". */
const STRIP_CAP = 5;
/** Strip blooms are a summary, not touch targets — the whole card is the target. */
const STRIP_BLOOM = 40;

/**
 * A short, readable line for the patch — never a percentage. Growth is named by
 * how the garden looks, and a thirsty patch appends the one thing to do about it.
 */
function patchPhrase(
  engagedCount: number,
  skillCount: number,
  growthPercent: number,
  thirsty: boolean,
): string {
  if (skillCount === 0) return 'No flowers here yet';

  let base: string;
  if (engagedCount === 0) base = 'Ready to grow';
  else if (growthPercent < 25) base = 'Just sprouting';
  else if (growthPercent < 50) base = 'Growing well';
  else if (growthPercent < 75) base = 'Coming into bloom';
  else if (growthPercent < 95) base = 'Almost in full bloom';
  else base = 'In full bloom';

  return thirsty ? `${base} · time to water` : base;
}

export interface GardenPatchProps {
  name: string;
  /** Mean live mastery over the patch, 0-100. Bands the phrase; never shown as a number. */
  growthPercent: number;
  skillCount: number;
  /** Finished flowers that have started to fade. Drives the watering nudge. */
  thirstyCount: number;
  /** The patch's flowers, already resolved to stages by the backend. */
  skills: GardenSkill[];
  /** Position in the list — only used to pick a fallback colour when the name doesn't match a subject. */
  index?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const GardenPatch: React.FC<GardenPatchProps> = ({
  name,
  growthPercent,
  skillCount,
  thirstyCount,
  skills,
  index = 0,
  onPress,
  style,
}) => {
  const v = getSubjectVisual(name, index);
  const emblem = getSubjectEmblem(name);
  const thirsty = thirstyCount > 0;

  // Seeds are exactly the un-engaged flowers (LOCKED/AVAILABLE); everything the
  // child has touched has grown past a seed. So "engaged" is just the non-seeds.
  const engagedCount = useMemo(
    () => skills.filter((s) => s.stage !== 'seed').length,
    [skills],
  );

  /**
   * Fullest flowers lead the strip, so a patch shows off what has grown; ties
   * break on live mastery, then id, so the row never flickers between reads. The
   * whole set is one tap away in the subject screen, so a summary that leads with
   * the best work is honest rather than misleading.
   */
  const strip = useMemo(() => {
    const rank = (s: GardenSkill) => BLOOM_STAGE_ORDER.indexOf(s.stage);
    const sorted = [...skills].sort((a, b) => {
      const r = rank(b) - rank(a);
      if (r !== 0) return r;
      if (b.masteryScore !== a.masteryScore) return b.masteryScore - a.masteryScore;
      return a.skillId < b.skillId ? -1 : 1;
    });
    return sorted.slice(0, STRIP_CAP);
  }, [skills]);

  const overflow = Math.max(0, skillCount - strip.length);
  const phrase = patchPhrase(engagedCount, skillCount, growthPercent, thirsty);

  const spoken =
    `${name}. ${patchPhrase(engagedCount, skillCount, growthPercent, false)}.` +
    (thirsty
      ? ` ${thirstyCount} ${thirstyCount === 1 ? 'flower needs' : 'flowers need'} watering.`
      : '');

  return (
    <Card
      variant="raised"
      accent={v.color}
      rail
      padding="normal"
      onPress={onPress}
      style={[styles.stack, style]}
      accessibilityLabel={spoken}
      accessibilityHint="Opens this patch"
    >
      <View style={styles.row}>
        {emblem ? (
          <View style={[styles.emblem, { backgroundColor: v.soft }]}>
            <Image source={emblem} resizeMode="contain" style={styles.emblemImg} />
          </View>
        ) : (
          <IconWell icon={v.icon} color={v.color} soft={v.soft} />
        )}

        <View style={styles.rowText}>
          <Text style={[typography.presets.cardTitle, styles.title]} numberOfLines={2}>
            {name}
          </Text>
          <Text
            style={[
              typography.presets.caption,
              styles.phrase,
              thirsty && { color: colors.blueDark },
            ]}
            numberOfLines={1}
          >
            {phrase}
          </Text>
        </View>

        {/* A quiet count so the patch says how much is planted here at a glance. */}
        {skillCount > 0 ? (
          <View style={[styles.countChip, { backgroundColor: v.soft }]}>
            <Text style={[styles.countText, { color: v.color }]}>{skillCount}</Text>
          </View>
        ) : null}

        <PetalIcon name="forward" size={20} color={v.color} />
      </View>

      {/* How grown this patch is, as a bloom‑fill bar in the subject's own colour
          (never a number for the child, and never stars — those mean rewards). */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.max(0, Math.min(100, growthPercent))}%`, backgroundColor: v.color },
          ]}
        />
      </View>

      {/* The patch itself: the subject's real flowers planted in a soft bed of its
          own colour, sitting on a strip of soil, so a row of seeds reads as a
          tended garden plot rather than icons on a line. Decorative — the card's
          label already speaks it. */}
      {skillCount > 0 ? (
        <View
          style={[styles.planter, { backgroundColor: v.soft }]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.strip}>
            {strip.map((s) => (
              <SkillBloom
                key={s.skillId}
                stage={s.stage}
                thirsty={s.needsWater}
                size={STRIP_BLOOM}
                tint={v.color}
                decorative
              />
            ))}
            {overflow > 0 ? (
              <View style={[styles.more, { backgroundColor: colors.surface }]}>
                <Text style={[typography.presets.caption, styles.moreText, { color: v.color }]}>
                  +{overflow}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.soil, { backgroundColor: v.color }]} />
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  stack: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
  },
  phrase: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  emblem: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  emblemImg: {
    width: '100%',
    height: '100%',
  },
  countChip: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  countText: {
    fontWeight: '800',
    fontSize: 13,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  /* A soft bed of the subject's own colour that frames the flowers, so even a
     patch of pure seeds reads as tended ground rather than a lonely line. */
  planter: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: STRIP_BLOOM,
  },
  more: {
    minWidth: STRIP_BLOOM * 0.8,
    height: STRIP_BLOOM * 0.8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  moreText: {
    fontWeight: '700',
  },
  /* A strip of ground under the flowers, tinted to the subject so the bed reads
     as its own plot of earth. */
  soil: {
    height: 4,
    borderRadius: radius.pill,
    opacity: 0.3,
    marginTop: spacing.sm,
  },
});

export default GardenPatch;
