/**
 * My Rewards — reference screen 12 (spec §34 phase 6).
 *
 * One implementation for all three device variants. `RewardsMobile`,
 * `RewardsTablet` and `RewardsDesktop` were ~10KB each and 95% identical; the
 * differences that remained were mostly drift rather than design:
 *
 *  - Mobile described a locked sticker as "Unlocks at 12 stars", tablet and
 *    desktop as "Requires 12 stars", for the same data. Unified on the friendlier
 *    child-facing wording.
 *  - Mobile's section header said "Magical Stickers" / "Learning Badges", the
 *    other two "Earned Trophies". Unified on the tab-aware pair.
 *  - Desktop labelled the sidebar counters "Stickers Unlocked", tablet
 *    "Stickers". They now live on the tabs themselves, where the count belongs.
 *
 * The one *structural* difference was real: tablet and desktop put the Star Bank
 * in a fixed 280/320px right sidebar beside a `width: '48%'` / `width: '31%'`
 * grid. That is exactly the hardcoded, percentage-based layout §27 warns about,
 * and it broke at any width between the two. The collection grid is now a single
 * wrapping row whose cards flex from a minimum width, so the column count
 * follows the space actually available — 1 up on a phone, 2 on a tablet, 3 on a
 * desktop — with no element lost from any variant.
 *
 * Data and navigation are untouched (§1): the same `useRewardsStore`,
 * `useXP`/`useCoins`/`useDailyStreak` hooks, the same `refreshRewards()` on
 * mount, and all four destinations (`BadgeGallery`, `Achievements`,
 * `DailyChallenges`, `NotificationPreferences`) still reachable —
 * Notifications now via the header bell.
 *
 * `XPCard`, `CoinCard` and `StreakCard` were imported only by these three files.
 * Every number they showed is still here (xp, level, progressToNext,
 * nextLevelXP, coin balance, currentStreak, longestStreak), rendered with
 * `StatGrid` + `ProgressIndicator` instead of three separately-styled cards that
 * each carried their own Ionicons and, in StreakCard's case, a 🔥 emoji (§7).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, radius, shadows, spacing, typography } from '../../theme';
import { SCREEN_BACKGROUNDS } from '../../assets/backgrounds';
import { REWARD_IMAGES } from '../../assets/rewards';
import { SCREEN_ACCENTS } from '../../theme/screenAccents';
import { useRewardsStore } from '../../store/rewardsStore';
import { useChildStore } from '../../store/childStore';
import { useXP, useCoins, useDailyStreak } from '../../hooks/useRewards';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { getMilestoneForLevel } from '../../services/gamification/derivations';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import {
  AppHeader,
  AppShell,
  AvatarGlyph,
  Card,
  PetalIcon,
  ProgressIndicator,
  RewardBadge,
  RewardCard,
  SegmentedTabs,
  StatGrid,
} from '../../components/design';
import type { PetalIconName } from '../../components/icons';
import { PetalMark } from '../../components/brand/PetalMark';

export type RewardsVariant = 'mobile' | 'tablet' | 'desktop';

const VARIANTS: Record<
  RewardsVariant,
  {
    /** Caps the column so one card never stretches across a wide window. */
    maxWidth?: number;
    /**
     * Minimum width of a reward card. Cards grow past it and wrap, so the
     * column count follows the real available width instead of a hardcoded
     * percentage (§27).
     */
    cardMinWidth: number;
  }
> = {
  mobile: { cardMinWidth: 280 },
  tablet: { maxWidth: 900, cardMinWidth: 300 },
  desktop: { maxWidth: 1120, cardMinWidth: 320 },
};

/** The three shortcuts that used to sit in the quick-nav row. */
const QUICK_LINKS: Array<{
  route: string;
  label: string;
  icon: PetalIconName;
  color: string;
  soft: string;
}> = [
  { route: 'BadgeGallery', label: 'Badges', icon: 'medal', color: colors.primary, soft: colors.primaryLight },
  { route: 'Achievements', label: 'Achievements', icon: 'trophy', color: colors.orange, soft: colors.warningLight },
  { route: 'DailyChallenges', label: 'Challenges', icon: 'calendar', color: colors.leafGreen, soft: colors.greenSoft },
];

type Tab = 'stickers' | 'badges';

export interface RewardsContentProps {
  variant: RewardsVariant;
}

export const RewardsContent: React.FC<RewardsContentProps> = ({ variant }) => {
  const cfg = VARIANTS[variant];
  const navigation = useNavigation() as any;

  const activeChild = useChildStore((state) => state.activeChild);
  const { totalStars, stickers, badges, loading, error, refreshRewards } = useRewardsStore();
  const xp = useXP();
  const coins = useCoins();
  const streak = useDailyStreak();
  const [activeTab, setActiveTab] = useState<Tab>('stickers');

  useEffect(() => {
    refreshRewards();
  }, []);

  const childName = activeChild?.name || 'Explorer';
  const mentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

  const unlockedStickersCount = stickers.filter((s) => s.unlocked).length;
  const earnedBadgesCount = badges.filter((b) => b.earned).length;

  const level = xp.data?.level ?? 1;
  const milestone = getMilestoneForLevel(level);

  /* Level, XP, coins and streak — the four numbers the three retired cards
     showed, in the shared stat tiles. */
  const stats = useMemo(
    () => [
      { label: 'XP', value: `${xp.data?.xp ?? 0}`, icon: 'sparkle' as PetalIconName, color: colors.purple },
      { label: 'Coins', value: `${(coins.data ?? 0).toLocaleString()}`, icon: 'coin' as PetalIconName, color: colors.yellow },
      { label: 'Day Streak', value: `${streak.data?.currentStreak ?? 0}`, icon: 'flame' as PetalIconName, color: colors.orange },
      { label: 'Best Streak', value: `${streak.data?.longestStreak ?? 0}`, icon: 'trophy' as PetalIconName, color: colors.leafGreen },
    ],
    [xp.data?.xp, coins.data, streak.data?.currentStreak, streak.data?.longestStreak]
  );

  const items = activeTab === 'stickers' ? stickers : badges;
  const isEmpty = !loading && !error && items.length === 0;

  return (
    <AppShell
      withBottomNav
      petals="none"
      backgroundImage={SCREEN_BACKGROUNDS.rewards} accent={SCREEN_ACCENTS.rewards}
      refreshControl={
        <RefreshControl
          refreshing={loading && stickers.length > 0}
          onRefresh={refreshRewards}
          tintColor={colors.primary}
        />
      }
      header={
        <AppHeader
          accent={SCREEN_ACCENTS.rewards}
          eyebrow="Your collection"
          title="My Rewards"
          stars={totalStars}
          streak={streak.data?.currentStreak ?? 0}
          onPressNotifications={() => navigation.navigate('NotificationPreferences')}
        />
      }
    >
      <View style={[styles.column, cfg.maxWidth ? { maxWidth: cfg.maxWidth } : null]}>
        {/* ------------------------------------------------------- Star Bank */}
        <Card variant="raised" padding="normal" accent={mentor.color}>
          <View style={styles.bankRow}>
            <AvatarGlyph
              species={mentor.species}
              size={64}
              ringColor={mentor.color}
              accessibilityLabel={`${mentor.name}, who looks after your treasure`}
            />

            <View style={styles.bankText}>
              <Text style={[typography.presets.eyebrow, { color: mentor.color }]} numberOfLines={1}>
                {mentor.name.split(' ')[0]}’s Treasure
              </Text>
              <Text style={[typography.presets.section, styles.bankTitle]} numberOfLines={2}>
                {childName}’s Star Bank
              </Text>
            </View>
          </View>

          {/* The Hearts and Petals figures are the shipped placeholders — kept
              exactly as they were rather than quietly changed. */}
          <View style={styles.bankBadges}>
            <RewardBadge kind="stars" value={totalStars} showUnit />
            <RewardBadge kind="hearts" value={totalStars === 0 ? 0 : 8} showUnit />
            <RewardBadge kind="petals" value={totalStars === 0 ? 0 : 12} showUnit />
          </View>
        </Card>

        {/* ---------------------------------------------------- Level & stats */}
        <Card variant="raised" padding="normal" accent={colors.purple}>
          <View style={styles.levelRow}>
            <Text style={[typography.presets.cardTitle, styles.levelTitle]} numberOfLines={2}>
              Level {level}
              {milestone ? ` · ${milestone.label}` : ''}
            </Text>
            {milestone?.reward ? (
              <Text style={[typography.presets.caption, styles.levelReward]} numberOfLines={1}>
                {milestone.reward}
              </Text>
            ) : null}
          </View>

          <ProgressIndicator
            value={xp.data?.progressToNext ?? 0}
            label={`${xp.data?.xp ?? 0} of ${xp.data?.nextLevelXP ?? 100} XP`}
            showPercentage
            style={styles.levelProgress}
            accessibilityLabel={`Level ${level}. ${xp.data?.xp ?? 0} of ${
              xp.data?.nextLevelXP ?? 100
            } experience points.`}
          />

          <StatGrid stats={stats} style={styles.statGrid} />
        </Card>

        {/* ------------------------------------------------------ Quick links */}
        <View style={styles.quickNav}>
          {QUICK_LINKS.map((link) => (
            <Pressable
              key={link.route}
              onPress={() => navigation.navigate(link.route)}
              accessibilityRole="button"
              accessibilityLabel={link.label}
              style={({ pressed }) => [styles.quickNavItem, pressed && styles.quickNavPressed]}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: link.soft }]}>
                <PetalIcon name={link.icon} size={18} color={link.color} filled />
              </View>
              <Text style={[typography.presets.caption, styles.quickNavText]} numberOfLines={1}>
                {link.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ------------------------------------------------------- Collection */}
        <View style={styles.sectionHeading}>
          <Text style={[typography.presets.section, styles.sectionTitle]} accessibilityRole="header">
            {activeTab === 'stickers' ? 'Magical Stickers' : 'Learning Badges'}
          </Text>
          <Text style={[typography.presets.subtle, styles.sectionSubtitle]}>
            {activeTab === 'stickers'
              ? 'Collect stars to unlock cute forest animals!'
              : 'Earned by completing subject paths!'}
          </Text>
        </View>

        <SegmentedTabs
          items={[
            {
              key: 'stickers' as Tab,
              label: 'Stickers',
              icon: 'sparkle',
              count: `${unlockedStickersCount}/${stickers.length}`,
            },
            {
              key: 'badges' as Tab,
              label: 'Badges',
              icon: 'medal',
              count: `${earnedBadgesCount}/${badges.length}`,
            },
          ]}
          selected={activeTab}
          onSelect={setActiveTab}
          accessibilityLabel="Collection"
        />

        {loading && stickers.length === 0 ? (
          <View style={styles.center}>
            <PetalMark size={96} loading />
            <Text style={[typography.presets.caption, styles.loadingText]}>
              Opening your treasure chest…
            </Text>
          </View>
        ) : error ? (
          <ErrorState
            title="Couldn’t load your rewards"
            message={error}
            onRetry={refreshRewards}
          />
        ) : isEmpty ? (
          /* `EmptyState` is `flex: 1`, which resolves to nothing inside a scroll
             view's auto-height content — the wrapper's `minHeight` gives it room
             to centre in. */
          <View style={styles.emptyWrap}>
            {/* The closed chest says "nothing collected yet" far better than a
                glyph, and pairs with the open chest shown once there is. */}
            <Image
              source={REWARD_IMAGES.empty}
              style={styles.emptyArt}
              resizeMode="contain"
              accessible={false}
            />
            <EmptyState
              title={activeTab === 'stickers' ? 'No stickers yet' : 'No badges yet'}
              message="Finish a lesson to start filling your collection."
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {activeTab === 'stickers'
              ? stickers.map((s) => (
                  <RewardCard
                    key={s.id}
                    title={s.name}
                    description={s.description || `Unlocks at ${s.requiredStars} stars`}
                    /* The requirement is only useful while it is still a
                       requirement; an unlocked sticker shows a tick instead. */
                    starValue={s.unlocked ? undefined : s.requiredStars}
                    unlocked={s.unlocked}
                    kind="sticker"
                    style={[styles.gridItem, { flexBasis: cfg.cardMinWidth }]}
                  />
                ))
              : badges.map((b) => (
                  <RewardCard
                    key={b.id}
                    title={b.name}
                    description={b.description || 'Complete activities to earn this badge'}
                    unlocked={b.earned}
                    kind="badge"
                    style={[styles.gridItem, { flexBasis: cfg.cardMinWidth }]}
                  />
                ))}
          </View>
        )}
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  emptyArt: {
    width: 160,
    height: 160,
    alignSelf: 'center',
  },
  column: {
    width: '100%',
    alignSelf: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },

  // ------------------------------------------------------------- Star Bank
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bankText: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  bankTitle: {
    color: colors.text,
  },
  bankBadges: {
    flexDirection: 'row',
    /* Wraps instead of squeezing three pills onto a 360px row (§27). */
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  // ---------------------------------------------------------- Level & stats
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  levelTitle: {
    color: colors.text,
    /* "Level 7 · Blossom Champion" — the milestone label is appended here, so
       this is the long half of the row and `levelReward` beside it already
       shrinks. Without this the row would push past the card edge. */
    flexShrink: 1,
  },
  levelReward: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  levelProgress: {
    marginTop: spacing.md,
  },
  statGrid: {
    marginTop: spacing.md,
  },

  // ----------------------------------------------------------- Quick links
  quickNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    /* Grows to share the row evenly, wraps rather than overflowing. */
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceTranslucent,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    ...shadows.sm,
  },
  quickNavPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  quickNavIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavText: {
    color: colors.text,
    flexShrink: 1,
  },

  // ------------------------------------------------------------ Collection
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
  emptyWrap: {
    minHeight: 300,
    justifyContent: 'center',
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
  },
});

export default RewardsContent;
