/**
 * My Profile — reference screen 15, with the Parents Section from reference
 * screen 16 behind its gate (spec §34 phase 7, §26).
 *
 * One implementation for all three device variants. `ProfileMobile` (796 lines)
 * and `ProfileTablet` (594 lines, which `ProfileDesktop` simply re-rendered)
 * had drifted badly apart, and almost every difference was a loss rather than a
 * design decision:
 *
 *  - Tablet had **no parental gate at all**. The math challenge, the lock and the
 *    whole "Parents Section" wrapper existed only on mobile, so on a tablet a
 *    child could reach the parent dashboard, every child profile and the reset
 *    button by scrolling. The gate now applies on every size.
 *  - Tablet's reset handler never re-locked the parent section and never
 *    navigated to the roadmap afterwards; mobile's did both. Mobile's version is
 *    the complete one, so it is the one kept.
 *  - Tablet refreshed only `refreshChildren()`, and only on mount. Mobile
 *    refreshed children, rewards and progress on every focus. Kept.
 *  - Stats (stars / progress / rewards) and Recent Achievements existed only on
 *    mobile; the voice-guidance settings group existed only on mobile; the
 *    child's companion detail panel existed only on tablet. All of it is here.
 *
 * Two things are deliberately *changed* rather than carried across:
 *
 *  1. The three tutorial switches read `useTutorialStore.getState()` inline, so
 *     they were not subscribed to the store — flipping one updated the setting
 *     but the thumb stayed put until an unrelated re-render. They now read
 *     through selectors, which is the same data by the intended route.
 *  2. Tapping a child row activated that child on mobile but only *selected* it
 *     on tablet, where a second "Switch to Active Child" button did the
 *     activating. One row cannot mean two things, so a tap activates (the
 *     mobile rule) and the companion/age-group detail that used to live in the
 *     tablet sidebar is shown under the list for the active child. Inspecting a
 *     child without activating them is still possible — every row keeps its
 *     pencil button through to `AddChild`, which shows the full record.
 *
 * Everything else is untouched (§1): the same logout call and teardown order,
 * the same `challengeA * challengeB` gate, the same `resetProgress()` flow with
 * its web/native alert split, and the same four navigation targets.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import { useChildStore } from '../../store/childStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useRewardsStore } from '../../store/rewardsStore';
import { useProgressStore } from '../../store/progressStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { colors, radius, spacing, typography, cardSizes } from '../../theme';
import {
  AppHeader,
  AppShell,
  AvatarGlyph,
  Card,
  DestructiveAction,
  IconButton,
  ParentRow,
  ParentSection,
  PetalIcon,
  PrimaryButton,
  ProfileCard,
  SecondaryButton,
  StatGrid,
  StatusBadge,
} from '../../components/design';
import type { Stat } from '../../components/design';

export type ProfileVariant = 'mobile' | 'tablet' | 'desktop';

const VARIANTS: Record<ProfileVariant, { maxWidth?: number }> = {
  mobile: {},
  tablet: { maxWidth: 900 },
  desktop: { maxWidth: 1120 },
};

/** Two-letter monogram for the grown-up's account card. Unchanged. */
const getInitials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export interface ProfileContentProps {
  variant: ProfileVariant;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({ variant }) => {
  const cfg = VARIANTS[variant];
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const user = useAppStore((state) => state.user);
  const preferences = useAppStore((state) => state.preferences);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const toggleMusic = useAppStore((state) => state.toggleMusic);
  const refreshToken = useAppStore((state) => state.refreshToken);
  const clearSession = useAppStore((state) => state.clearSession);

  const { childrenList, activeChild, setActiveChild, refreshChildren } = useChildStore();
  const { totalStars, stickers, badges, refreshRewards } = useRewardsStore();
  const { completionPercentage, recentAchievements, refreshProgress } = useProgressStore();
  const resetProgress = useRoadmapStore((state) => state.resetProgress);

  /* Selectors, not `getState()` — see the note at the top of the file. */
  const guideEnabled = useTutorialStore((state) => state.enabled);
  const toggleGuide = useTutorialStore((state) => state.toggleGuide);
  const animationsEnabled = useTutorialStore((state) => state.animationsEnabled);
  const setAnimationsEnabled = useTutorialStore((state) => state.setAnimationsEnabled);
  const reduceMotion = useTutorialStore((state) => state.reduceMotion);
  const setReduceMotion = useTutorialStore((state) => state.setReduceMotion);

  // ----------------------------------------------------------- parental gate
  const [parentSectionOpen, setParentSectionOpen] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeA, setChallengeA] = useState(0);
  const [challengeB, setChallengeB] = useState(0);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [challengeError, setChallengeError] = useState(false);

  const generateChallenge = () => {
    const a = Math.floor(Math.random() * 8) + 3; // 3-10
    const b = Math.floor(Math.random() * 8) + 3; // 3-10
    setChallengeA(a);
    setChallengeB(b);
    setChallengeAnswer('');
    setChallengeError(false);
  };

  const handleParentSectionTap = () => {
    if (parentSectionOpen) {
      setParentSectionOpen(false);
      setShowChallenge(false);
      return;
    }
    if (showChallenge) {
      setShowChallenge(false);
      return;
    }
    generateChallenge();
    setShowChallenge(true);
  };

  const handleChallengeSubmit = () => {
    const correct = challengeA * challengeB;
    if (parseInt(challengeAnswer, 10) === correct) {
      setParentSectionOpen(true);
      setShowChallenge(false);
      setChallengeError(false);
    } else {
      setChallengeError(true);
      setChallengeAnswer('');
    }
  };

  // ----------------------------------------------------------------- refresh
  useFocusEffect(
    useCallback(() => {
      refreshChildren();
      refreshRewards();
      refreshProgress();
    }, [refreshChildren, refreshRewards, refreshProgress]),
  );

  // ------------------------------------------------------------------ logout
  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      if (__DEV__) console.warn('Logout API failed:', err);
    } finally {
      setActiveChild(null);
      clearSession();
      queryClient.clear();
    }
  };

  // ------------------------------------------------------------------- reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleResetConfirmed = async () => {
    if (!activeChild) return;
    setResetting(true);
    try {
      await resetProgress();
      setShowResetConfirm(false);
      setResetting(false);
      setParentSectionOpen(false); // Relock parents section
      notify('Success', 'Your learning progress has been successfully reset.');
      // Switch to the Journey tab so the reset map is visible straight away.
      navigation.navigate('MainTabs', { screen: 'Journey' });
    } catch (err) {
      if (__DEV__) console.error('[RESET] error:', err);
      setResetting(false);
      notify('Error', 'Failed to reset learning progress. Please try again.');
    }
  };

  // ------------------------------------------------------------------- stats
  const earnedCount =
    badges.filter((b) => b.earned).length + stickers.filter((s) => s.unlocked).length;

  const stats = useMemo<Stat[]>(
    () => [
      { label: 'Stars', value: String(totalStars), icon: 'star', color: colors.yellow },
      { label: 'Progress', value: `${completionPercentage}%`, icon: 'chart', color: colors.purple },
      { label: 'Rewards', value: String(earnedCount), icon: 'medal', color: colors.primary },
    ],
    [totalStars, completionPercentage, earnedCount],
  );

  const recentBadges = (recentAchievements?.badges ?? []).filter(Boolean);
  const recentStickers = (recentAchievements?.stickers ?? []).filter(Boolean);
  const hasRecent = recentBadges.length > 0 || recentStickers.length > 0;

  const childName = activeChild?.name || 'Explorer';

  return (
    <AppShell
      withBottomNav
      header={
        <AppHeader
          eyebrow="Stats, achievements & settings"
          title={`${childName}'s Profile`}
          stars={totalStars}
        />
      }
    >
      <View style={[styles.column, cfg.maxWidth ? { maxWidth: cfg.maxWidth } : null]}>
        {/* ------------------------------------------------------ Active child */}
        <Card variant="raised" padding="roomy" accent={colors.primary} rail>
          <View style={styles.heroRow}>
            <AvatarGlyph
              species={activeChild?.avatar}
              size={cardSizes.iconWellLarge}
              ringColor={colors.primary}
              style={styles.heroAvatar}
            />
            <View style={styles.heroText}>
              <Text style={[typography.presets.title, styles.heroName]} numberOfLines={1}>
                {childName}
              </Text>
              {activeChild ? (
                <Text style={[typography.presets.caption, styles.muted]} numberOfLines={1}>
                  Age {activeChild.age} · {activeChild.mentor?.name || 'No companion yet'}
                </Text>
              ) : (
                <Text style={[typography.presets.caption, styles.muted]}>
                  No profile selected yet
                </Text>
              )}
            </View>
            {activeChild ? <StatusBadge status="current" label="Active" size="sm" /> : null}
          </View>

          <StatGrid stats={stats} style={styles.heroStats} />
        </Card>

        {/* --------------------------------------------------- Recent rewards */}
        {hasRecent ? (
          <View style={styles.section}>
            <Text
              style={[typography.presets.section, styles.sectionTitle]}
              accessibilityRole="header"
            >
              Recent Achievements
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strip}
            >
              {recentBadges.map((badge, idx) => (
                <Achievement
                  key={`b-${badge?.id ?? idx}`}
                  icon="medal"
                  tint={colors.primary}
                  wash={colors.primaryLight}
                  label={badge?.name || 'Badge'}
                  kind="Badge"
                />
              ))}
              {recentStickers.map((sticker, idx) => (
                <Achievement
                  key={`s-${sticker?.id ?? idx}`}
                  icon="sparkle"
                  tint={colors.yellow}
                  wash={colors.yellowSoft}
                  label={sticker?.name || 'Sticker'}
                  kind="Sticker"
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ------------------------------------------------------------ Logout */}
        <SecondaryButton label="Log Out" icon="logout" fill="outline" onPress={handleLogout} />

        {/* ----------------------------------------------------- Parents gate */}
        <Card
          variant={parentSectionOpen ? 'selected' : 'flat'}
          accent={colors.purple}
          padding="normal"
          onPress={handleParentSectionTap}
          accessibilityLabel={
            parentSectionOpen ? 'Parents Section, unlocked' : 'Parents Section, locked'
          }
          accessibilityHint={
            parentSectionOpen ? 'Hides the grown-up settings' : 'Asks a question to unlock'
          }
        >
          <View style={styles.gateRow}>
            <PetalIcon
              name={parentSectionOpen ? 'parent' : 'lock'}
              size={20}
              color={colors.purple}
            />
            <View style={styles.heroText}>
              <Text style={[typography.presets.cardTitle, styles.gateTitle]}>Parents Section</Text>
              {/* Spelled out, so the state does not depend on the icon alone (§30). */}
              <Text style={[typography.presets.caption, styles.muted]}>
                {parentSectionOpen ? 'Unlocked' : 'Locked — grown-ups only'}
              </Text>
            </View>
            <PetalIcon
              name={parentSectionOpen ? 'arrowUp' : 'arrowDown'}
              size={18}
              color={colors.textMuted}
            />
          </View>
        </Card>

        {/* ---------------------------------------------------- Math challenge */}
        {showChallenge && !parentSectionOpen ? (
          <Card variant="raised" padding="roomy" accent={colors.purple}>
            <View style={styles.challenge}>
              <Text style={[typography.presets.eyebrow, styles.muted]}>Parental verification</Text>
              <Text style={[typography.presets.display, styles.challengeQuestion]}>
                {challengeA} × {challengeB} = ?
              </Text>
              <View style={styles.challengeRow}>
                <TextInput
                  style={[styles.challengeInput, challengeError && styles.challengeInputError]}
                  value={challengeAnswer}
                  onChangeText={(t) => {
                    setChallengeAnswer(t);
                    setChallengeError(false);
                  }}
                  keyboardType="number-pad"
                  placeholder="?"
                  placeholderTextColor={colors.textMuted}
                  maxLength={3}
                  returnKeyType="done"
                  onSubmitEditing={handleChallengeSubmit}
                  accessibilityLabel={`What is ${challengeA} times ${challengeB}?`}
                />
                <IconButton
                  icon="check"
                  variant="solid"
                  tone="purple"
                  onPress={handleChallengeSubmit}
                  accessibilityLabel="Check answer"
                />
              </View>
              {challengeError ? (
                <Text
                  style={[typography.presets.caption, styles.challengeError]}
                  accessibilityLiveRegion="polite"
                >
                  That’s not right — try again!
                </Text>
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* --------------------------------------------------- Parent content */}
        {parentSectionOpen ? (
          <View style={styles.parentBlock}>
            <PrimaryButton
              label="Parent Dashboard"
              icon="chart"
              tone="purple"
              onPress={() => navigation.navigate('ParentDashboard')}
            />

            {/* ------------------------------------------------ Parent account */}
            <ParentSection title="Parent Account" icon="profile">
              <View style={styles.accountRow}>
                <View style={styles.accountAvatar}>
                  <Text style={[typography.presets.cardTitle, styles.accountInitials]}>
                    {getInitials(user?.name)}
                  </Text>
                </View>
                <View style={styles.heroText}>
                  <Text style={[typography.presets.cardTitle, styles.gateTitle]} numberOfLines={1}>
                    {user?.name || 'Explorer Parent'}
                  </Text>
                  <Text style={[typography.presets.caption, styles.muted]} numberOfLines={1}>
                    {user?.email || 'parent@petalpath.com'}
                  </Text>
                  <Text style={[typography.presets.eyebrow, styles.accountRole]}>
                    {user?.role
                      ? `${user.role.charAt(0)}${user.role.slice(1).toLowerCase()} Account`
                      : 'Parent Account'}
                  </Text>
                </View>
              </View>
            </ParentSection>

            {/* --------------------------------------------- Children profiles */}
            <ParentSection
              title="Children Profiles"
              subtitle="Tap a child to make their profile active."
              icon="profile"
              boxed={false}
              right={
                <IconButton
                  icon="plus"
                  variant="soft"
                  tone="brand"
                  onPress={() => navigation.navigate('AddChild')}
                  accessibilityLabel="Add a child"
                />
              }
            >
              <View style={styles.childList}>
                {childrenList.map((child) => (
                  <ProfileCard
                    key={child.id}
                    name={child.name}
                    species={child.avatar}
                    detail={`Age ${child.age} · ${child.mentor?.name || 'No companion'}`}
                    active={activeChild?.id === child.id}
                    onPress={() => setActiveChild(child)}
                    action={{
                      icon: 'pencil',
                      label: `Edit ${child.name}'s profile`,
                      onPress: () => navigation.navigate('AddChild', { childId: child.id }),
                    }}
                  />
                ))}
              </View>

              {/* The companion detail that used to sit in the tablet sidebar. */}
              {activeChild ? (
                <Card variant="flat" padding="normal" style={styles.detailCard}>
                  <Text style={[typography.presets.eyebrow, styles.muted]}>Active profile</Text>
                  <ParentRow
                    label="Age group"
                    value={`${activeChild.age} · ${activeChild.ageGroup}`}
                  />
                  {activeChild.mentor ? (
                    <ParentRow
                      label={activeChild.mentor.name}
                      description={activeChild.mentor.description}
                      icon="mentors"
                      divided
                    />
                  ) : (
                    <ParentRow label="Companion" value="None chosen" icon="mentors" divided />
                  )}
                  <SecondaryButton
                    label="Edit Profile Details"
                    icon="settings"
                    size="sm"
                    fill="outline"
                    onPress={() =>
                      navigation.navigate('AddChild', { childId: activeChild.id })
                    }
                    style={styles.detailButton}
                  />
                </Card>
              ) : null}
            </ParentSection>

            {/* ---------------------------------------------------- Settings */}
            <ParentSection title="General Settings" icon="settings">
              <ParentRow
                label="Sound Effects"
                icon="sound"
                toggle={{ value: preferences.soundEnabled, onValueChange: toggleSound }}
              />
              <ParentRow
                label="Background Music"
                icon="play"
                divided
                toggle={{ value: preferences.musicEnabled, onValueChange: toggleMusic }}
              />
              <ParentRow
                label="Voice Guidance"
                description="Spoken instructions on every activity"
                icon="microphone"
                divided
                toggle={{ value: guideEnabled, onValueChange: () => toggleGuide() }}
              />
              <ParentRow
                label="Tutorial Animations"
                description="The pointing hand that demonstrates each step"
                icon="sparkle"
                divided
                toggle={{ value: animationsEnabled, onValueChange: setAnimationsEnabled }}
              />
              <ParentRow
                label="Reduce Motion"
                description="Calmer transitions throughout the app"
                icon="info"
                divided
                toggle={{ value: reduceMotion, onValueChange: setReduceMotion }}
              />
            </ParentSection>

            {/* -------------------------------------------- Privacy & support */}
            <ParentSection title="About & Support" icon="info">
              <Text style={[typography.presets.eyebrow, styles.muted]}>Privacy</Text>
              <Text style={[typography.presets.caption, styles.prose]}>
                Your child’s learning activity is stored securely and used only to personalize their
                experience. We never sell personal information.
              </Text>

              <View style={styles.divider} />

              <Text style={[typography.presets.eyebrow, styles.muted]}>About PetalPath</Text>
              <Text style={[typography.presets.caption, styles.prose]}>
                PetalPath helps children learn through playful, adaptive activities guided by a
                friendly companion. This parent section lets you manage profiles and preferences.
              </Text>

              <View style={styles.divider} />

              <Text style={[typography.presets.eyebrow, styles.muted]}>Help &amp; Support</Text>
              <Text style={[typography.presets.caption, styles.prose]}>
                For questions or assistance, contact your program administrator or visit the
                PetalPath Help Center.
              </Text>
            </ParentSection>

            {/* ------------------------------------------------------- Danger */}
            {!showResetConfirm ? (
              <DestructiveAction
                title="Reset Learning Progress"
                description="Permanently erases every completed lesson, activity score and companion milestone for the active child profile. This cannot be undone."
                buttonLabel="Reset All Progress"
                onPress={() => setShowResetConfirm(true)}
                disabled={!activeChild}
              />
            ) : (
              <View style={styles.confirmBox}>
                <View style={styles.confirmHead}>
                  <PetalIcon name="warning" size={20} color={colors.error} />
                  <Text style={[typography.presets.cardTitle, styles.confirmTitle]}>
                    Reset {activeChild?.name || 'this profile'}?
                  </Text>
                </View>
                <Text style={[typography.presets.caption, styles.prose]}>
                  All progress for {activeChild?.name || 'this child'} will be erased. This cannot
                  be undone.
                </Text>
                <View style={styles.confirmRow}>
                  <SecondaryButton
                    label="Cancel"
                    fill="outline"
                    onPress={() => setShowResetConfirm(false)}
                    style={styles.confirmButton}
                  />
                  <PrimaryButton
                    label={resetting ? 'Resetting…' : 'Yes, Reset'}
                    icon="trash"
                    tone="danger"
                    onPress={handleResetConfirmed}
                    disabled={resetting}
                    loading={resetting}
                    style={styles.confirmButton}
                  />
                </View>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// One recent badge or sticker
// ---------------------------------------------------------------------------

const Achievement: React.FC<{
  icon: 'medal' | 'sparkle';
  tint: string;
  wash: string;
  label: string;
  kind: string;
}> = ({ icon, tint, wash, label, kind }) => (
  <View style={styles.achievement} accessible accessibilityLabel={`${kind}: ${label}`}>
    <View style={[styles.achievementWell, { backgroundColor: wash }]}>
      <PetalIcon name={icon} size={24} color={tint} filled />
    </View>
    <Text style={[typography.presets.caption, styles.achievementLabel]} numberOfLines={2}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignSelf: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  muted: {
    color: colors.textSecondary,
  },
  prose: {
    color: colors.text,
    marginTop: spacing.xs,
  },

  // ---------------------------------------------------------------- hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroAvatar: {
    flexShrink: 0,
  },
  heroText: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  heroName: {
    color: colors.text,
  },
  heroStats: {
    marginTop: spacing.lg,
  },

  // -------------------------------------------------------- achievements
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
  },
  strip: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  achievement: {
    width: 92,
    alignItems: 'center',
    gap: spacing.xs,
  },
  achievementWell: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementLabel: {
    color: colors.text,
    textAlign: 'center',
  },

  // ---------------------------------------------------------------- gate
  gateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gateTitle: {
    color: colors.text,
  },
  challenge: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeQuestion: {
    color: colors.text,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  challengeInput: {
    width: 84,
    height: 52,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.cardInner,
    backgroundColor: colors.backgroundSecondary,
    color: colors.text,
    fontFamily: typography.families.rounded,
    fontSize: 24,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  challengeInputError: {
    borderColor: colors.error,
  },
  challengeError: {
    color: colors.error,
  },

  // -------------------------------------------------------- parent block
  parentBlock: {
    gap: spacing.lg,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountAvatar: {
    width: cardSizes.iconWell,
    height: cardSizes.iconWell,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accountInitials: {
    color: colors.text,
  },
  accountRole: {
    color: colors.primary,
    marginTop: 2,
  },
  childList: {
    gap: spacing.md,
  },
  detailCard: {
    marginTop: spacing.md,
  },
  detailButton: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },

  // -------------------------------------------------------- reset confirm
  confirmBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.error,
    padding: cardSizes.padding,
    gap: spacing.sm,
  },
  confirmHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmTitle: {
    color: colors.error,
    flexShrink: 1,
  },
  confirmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  confirmButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 130,
  },
});

export default ProfileContent;
