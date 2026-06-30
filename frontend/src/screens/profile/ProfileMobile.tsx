import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Switch, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { api } from '../../api/client';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader } from '../../components/common/SectionHeader';
import { AppCard } from '../../components/cards/AppCard';
import { useAppStore } from '../../store/appStore';
import { useChildStore } from '../../store/childStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useRewardsStore } from '../../store/rewardsStore';
import { useProgressStore } from '../../store/progressStore';
import { spacing, colors, typography, radius } from '../../theme';
import { AppButton } from '../../components/buttons/AppButton';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarEmoji, getAvatarBgColor } from './ChildSelectionScreen';
import { useTutorialStore } from '../../store/tutorialStore';


export const ProfileMobile: React.FC = () => {
  const navigation = useNavigation<any>();

  const user = useAppStore((state) => state.user);
  const preferences = useAppStore((state) => state.preferences);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const toggleMusic = useAppStore((state) => state.toggleMusic);
  const refreshToken = useAppStore((state) => state.refreshToken);
  const clearSession = useAppStore((state) => state.clearSession);

  const { childrenList, activeChild, setActiveChild, refreshChildren } = useChildStore();
  const { totalStars, stickers, badges, refreshRewards } = useRewardsStore();
  const { completionPercentage, recentAchievements, refreshProgress } = useProgressStore();

  const [parentSectionOpen, setParentSectionOpen] = React.useState(false);
  const [showChallenge, setShowChallenge] = React.useState(false);
  const [challengeA, setChallengeA] = React.useState(0);
  const [challengeB, setChallengeB] = React.useState(0);
  const [challengeAnswer, setChallengeAnswer] = React.useState('');
  const [challengeError, setChallengeError] = React.useState(false);

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
      // Close it
      setParentSectionOpen(false);
      setShowChallenge(false);
      return;
    }
    // Show math challenge
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

  useFocusEffect(
    React.useCallback(() => {
      refreshChildren();
      refreshRewards();
      refreshProgress();
    }, [refreshChildren, refreshRewards, refreshProgress])
  );

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.warn('Logout API failed:', err);
    } finally {
      setActiveChild(null);
      clearSession();
    }
  };

  const resetProgress = useRoadmapStore((state) => state.resetProgress);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const handleResetConfirmed = async () => {
    if (!activeChild) return;
    setResetting(true);
    try {
      await resetProgress();
      setShowResetConfirm(false);
      setResetting(false);
      setParentSectionOpen(false); // Relock parents section
      
      if (Platform.OS === 'web') {
        window.alert('Your learning progress has been successfully reset.');
      } else {
        Alert.alert('Success', 'Your learning progress has been successfully reset.');
      }

      // Automatically switch to the Journey/Roadmap tab to visually show the reset map
      navigation.navigate('MainTabs', { screen: 'Journey' });
    } catch (err) {
      console.error('[RESET] error:', err);
      setResetting(false);
      if (Platform.OS === 'web') {
        window.alert('Failed to reset learning progress. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to reset learning progress. Please try again.');
      }
    }
  };

  const earnedCount = badges.filter(b => b.earned).length + stickers.filter(s => s.unlocked).length;

  return (
    <ScreenContainer>
      <TopBar title="My Profile" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <SectionHeader title={`${activeChild?.name || 'Explorer'}'s Profile`} subtitle="Your stats, achievements & settings" />
        
        <View style={styles.content}>

          {/* ===== Quick Stats Panel (outside Parents Section) ===== */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color={colors.yellow} />
              <Text style={styles.statVal}>{totalStars}</Text>
              <Text style={styles.statLbl}>Stars</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="bar-chart" size={24} color={colors.purple} />
              <Text style={styles.statVal}>{completionPercentage}%</Text>
              <Text style={styles.statLbl}>Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="medal" size={24} color={colors.purple} />
              <Text style={styles.statVal}>{earnedCount}</Text>
              <Text style={styles.statLbl}>Rewards</Text>
            </View>
          </View>

          {/* ===== Recent Achievements (outside Parents Section) ===== */}
          {((recentAchievements?.badges?.filter(Boolean).length ?? 0) > 0 || (recentAchievements?.stickers?.filter(Boolean).length ?? 0) > 0) && (
            <View style={styles.achievementsSection}>
              <Text style={styles.sectionTitle}>Recent Achievements</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
                {recentAchievements.badges.filter(Boolean).map((badge, idx) => (
                  <View key={`b-${idx}`} style={styles.achievementItem}>
                    <View style={styles.achievementBadge}>
                      <Ionicons name="ribbon" size={24} color={colors.purple} />
                    </View>
                    <Text style={styles.achievementText} numberOfLines={1}>{badge?.name || 'Badge'}</Text>
                  </View>
                ))}
                {recentAchievements.stickers.filter(Boolean).map((sticker, idx) => (
                  <View key={`s-${idx}`} style={styles.achievementItem}>
                    <View style={styles.achievementSticker}>
                      <Ionicons name="sparkles" size={24} color={colors.yellow} />
                    </View>
                    <Text style={styles.achievementText} numberOfLines={1}>{sticker?.name || 'Sticker'}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ===== Log Out Button (outside Parents Section) ===== */}
          <AppButton
            label="Log Out"
            onPress={handleLogout}
            variant="secondary"
            style={styles.logoutBtn}
          />

          {/* ===== Parents Section (locked gate) ===== */}
          <TouchableOpacity
            style={styles.parentSectionToggle}
            onPress={handleParentSectionTap}
            activeOpacity={0.7}
          >
            <View style={styles.parentSectionToggleInner}>
              <Ionicons name={parentSectionOpen ? 'lock-open' : 'lock-closed'} size={18} color={colors.purple} />
              <Text style={styles.parentSectionToggleText}>Parents Section</Text>
            </View>
            <Ionicons
              name={parentSectionOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {/* Math Challenge Gate */}
          {showChallenge && !parentSectionOpen && (
            <View style={styles.challengeContainer}>
              <Text style={styles.challengeTitle}>Parental Verification</Text>
              <Text style={styles.challengeQuestion}>
                What is {challengeA} × {challengeB}?
              </Text>
              <View style={styles.challengeInputRow}>
                <TextInput
                  style={[styles.challengeInput, challengeError && styles.challengeInputError]}
                  value={challengeAnswer}
                  onChangeText={(t) => { setChallengeAnswer(t); setChallengeError(false); }}
                  keyboardType="number-pad"
                  placeholder="?"
                  placeholderTextColor={colors.textMuted}
                  maxLength={3}
                  returnKeyType="done"
                  onSubmitEditing={handleChallengeSubmit}
                />
                <TouchableOpacity style={styles.challengeSubmitBtn} onPress={handleChallengeSubmit}>
                  <Ionicons name="checkmark" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
              {challengeError && (
                <Text style={styles.challengeErrorText}>That's not right — try again!</Text>
              )}
            </View>
          )}

          {parentSectionOpen && (
            <View style={styles.parentSectionContent}>

              {/* Parent Account */}
              <AppCard style={styles.card} outlined>
                <Text style={styles.cardTitle}>Parent Account</Text>
                <View style={styles.parentRow}>
                  <Ionicons name="person-circle-outline" size={40} color={colors.purple} style={{ marginRight: spacing.md }} />
                  <View>
                    <Text style={styles.parentName}>{user?.name || 'Explorer Parent'}</Text>
                    <Text style={styles.parentEmail}>{user?.email || 'parent@petalpath.com'}</Text>
                  </View>
                </View>
              </AppCard>

              {/* Children Profiles */}
              <AppCard style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.cardTitle}>Children Profiles</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AddChild')} style={styles.addBtn}>
                    <Text style={styles.addText}>+ Add Child</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.childrenList}>
                  {childrenList.map((child) => {
                    const isActive = activeChild?.id === child.id;
                    return (
                      <View key={child.id} style={[styles.childItemRow, isActive && styles.childItemRowActive]}>
                        <TouchableOpacity 
                          onPress={() => setActiveChild(child)} 
                          style={styles.childSelectArea}
                        >
                          <View style={[styles.miniAvatar, { backgroundColor: getAvatarBgColor(child.avatar) }]}>
                            <Text style={styles.miniAvatarText}>{getAvatarEmoji(child.avatar)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.childNameText, isActive && styles.activeChildText]}>
                              {child.name} {isActive && '🌟'}
                            </Text>
                            <Text style={styles.childAgeText}>Age {child.age} • {child.mentor?.name || 'No companion'}</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          onPress={() => navigation.navigate('AddChild', { childId: child.id })}
                          style={styles.editIconBtn}
                        >
                          <Ionicons name="create-outline" size={20} color={colors.purple} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </AppCard>

              {/* Settings */}
              <AppCard style={styles.card}>
                <Text style={styles.cardTitle}>General Settings</Text>
                
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Sound Effects</Text>
                  <Switch
                    value={preferences.soundEnabled}
                    onValueChange={toggleSound}
                    trackColor={{ false: colors.background, true: colors.purple }}
                    thumbColor={colors.white}
                  />
                </View>
                
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Background Music</Text>
                  <Switch
                    value={preferences.musicEnabled}
                    onValueChange={toggleMusic}
                    trackColor={{ false: colors.background, true: colors.purple }}
                    thumbColor={colors.white}
                  />
                </View>

                <View style={styles.settingDivider} />
                <Text style={styles.settingGroupTitle}>Voice Guidance</Text>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Voice Guidance</Text>
                  <Switch
                    value={useTutorialStore.getState().enabled}
                    onValueChange={() => useTutorialStore.getState().toggleGuide()}
                    trackColor={{ false: colors.background, true: colors.purple }}
                    thumbColor={colors.white}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Tutorial Animations</Text>
                  <Switch
                    value={useTutorialStore.getState().animationsEnabled}
                    onValueChange={(val) => useTutorialStore.getState().setAnimationsEnabled(val)}
                    trackColor={{ false: colors.background, true: colors.purple }}
                    thumbColor={colors.white}
                  />
                </View>

                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Reduce Motion</Text>
                  <Switch
                    value={useTutorialStore.getState().reduceMotion}
                    onValueChange={(val) => useTutorialStore.getState().setReduceMotion(val)}
                    trackColor={{ false: colors.background, true: colors.purple }}
                    thumbColor={colors.white}
                  />
                </View>
              </AppCard>

              {/* Reset Progress */}
              <AppCard style={[styles.card, styles.dangerCard]}>
                <Text style={[styles.cardTitle, styles.dangerTitle]}>Reset Learning Progress</Text>
                <Text style={styles.dangerText}>
                  This will permanently erase all completed lessons, activity scores, and companion progress for the active child profile. This action cannot be undone.
                </Text>
                {!showResetConfirm ? (
                  <AppButton
                    label="Reset All Progress"
                    onPress={() => setShowResetConfirm(true)}
                    variant="danger"
                    style={styles.resetBtn}
                  />
                ) : (
                  <View style={styles.confirmContainer}>
                    <Text style={styles.confirmText}>
                      Are you sure you want to reset all progress for {activeChild?.name}? This cannot be undone.
                    </Text>
                    <View style={styles.confirmRow}>
                      <AppButton
                        label="Cancel"
                        onPress={() => setShowResetConfirm(false)}
                        variant="secondary"
                        style={styles.confirmBtn}
                      />
                      <AppButton
                        label={resetting ? 'Resetting...' : 'Yes, Reset'}
                        onPress={handleResetConfirmed}
                        variant="danger"
                        disabled={resetting}
                        loading={resetting}
                        style={styles.confirmBtn}
                      />
                    </View>
                  </View>
                )}
              </AppCard>

            </View>
          )}

        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // --- Stats ---
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  statLbl: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
  },

  // --- Achievements ---
  achievementsSection: {
    width: '100%',
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  achievementsScroll: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  achievementItem: {
    width: 90,
    alignItems: 'center',
    gap: spacing.xs,
  },
  achievementBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.purple + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementSticker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.yellow + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementText: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    width: '100%',
  },

  // --- Logout ---
  logoutBtn: {
    backgroundColor: '#374151',
  },

  // --- Parents Section Toggle ---
  parentSectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  parentSectionToggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  parentSectionToggleText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },

  // --- Challenge Gate ---
  challengeContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.purple + '40',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeTitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  challengeQuestion: {
    color: colors.text,
    fontSize: 26,
    fontWeight: typography.weights.bold,
  },
  challengeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  challengeInput: {
    width: 70,
    height: 48,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 22,
    fontWeight: typography.weights.bold,
    textAlign: 'center' as const,
  },
  challengeInputError: {
    borderColor: '#EF4444',
  },
  challengeSubmitBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeErrorText: {
    color: '#EF4444',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },

  parentSectionContent: {
    gap: spacing.md,
  },

  // --- Cards ---
  card: {
    marginBottom: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  parentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  parentEmail: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#F5ECFF',
    borderRadius: radius.md,
  },
  addText: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  childrenList: {
    gap: spacing.sm,
  },
  childItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  childItemRowActive: {
    borderColor: colors.blue,
    backgroundColor: '#EEF2FF',
  },
  childSelectArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  miniAvatarText: {
    fontSize: 20,
  },
  childNameText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activeChildText: {
    color: colors.blue,
  },
  childAgeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  editIconBtn: {
    padding: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  settingLabel: {
    color: colors.text,
    fontSize: typography.sizes.sm,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  settingGroupTitle: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },

  // --- Danger / Reset ---
  dangerCard: {
    borderColor: '#FECACA',
    borderWidth: 1.5,
    backgroundColor: '#FFF5F5',
  },
  dangerTitle: {
    color: '#DC2626',
    marginBottom: spacing.xs,
  },
  dangerText: {
    color: '#7F1D1D',
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  resetBtn: {
    backgroundColor: '#EF4444',
  },
  confirmContainer: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  confirmText: {
    color: '#7F1D1D',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmBtn: {
    flex: 1,
    height: 44,
  },
});

export default ProfileMobile;
