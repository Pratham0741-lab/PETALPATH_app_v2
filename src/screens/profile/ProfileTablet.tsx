import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Switch, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { api } from '../../api/client';
import { SectionHeader } from '../../components/common/SectionHeader';
import { AppCard } from '../../components/cards/AppCard';
import { useAppStore } from '../../store/appStore';
import { useChildStore, Child } from '../../store/childStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { spacing, colors, typography, radius, shadows } from '../../theme';
import { AppButton } from '../../components/buttons/AppButton';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarEmoji, getAvatarBgColor } from './ChildSelectionScreen';
import { getMentorColor } from '../../constants/mentors';


export const ProfileTablet: React.FC = () => {
  const navigation = useNavigation<any>();

  const user = useAppStore((state) => state.user);
  const preferences = useAppStore((state) => state.preferences);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const toggleMusic = useAppStore((state) => state.toggleMusic);
  const refreshToken = useAppStore((state) => state.refreshToken);
  const clearSession = useAppStore((state) => state.clearSession);

  const { childrenList, activeChild, setActiveChild, refreshChildren } = useChildStore();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    refreshChildren();
  }, []);

  useEffect(() => {
    if (activeChild) {
      setSelectedChildId(activeChild.id);
    } else if (childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [activeChild, childrenList]);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.warn('Logout failed:', err);
    } finally {
      setActiveChild(null);
      clearSession();
    }
  };

  const resetProgress = useRoadmapStore((state) => state.resetProgress);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetConfirmed = async () => {
    if (!activeChild) return;
    setResetting(true);
    try {
      await resetProgress();
      setShowResetConfirm(false);
      setResetting(false);
      if (Platform.OS === 'web') {
        window.alert('Your learning progress has been successfully reset.');
      } else {
        Alert.alert('Success', 'Your learning progress has been successfully reset.');
      }
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


  const selectedChild = childrenList.find((c) => c.id === selectedChildId);

  return (
    <ScreenContainer>
      <View style={styles.layout}>
        {/* Left Side: Parent Details & Profiles List */}
        <ScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <SectionHeader title="Settings & Profiles" subtitle="Manage game configuration and child profiles." />
          
          <View style={styles.content}>
            {/* Parent Account Card */}
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

            {/* Profiles List */}
            <AppCard style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardTitle}>Children Profiles</Text>
                <AppButton
                  label="Add Child"
                  onPress={() => navigation.navigate('AddChild')}
                  variant="secondary"
                  style={styles.addBtn}
                />
              </View>
              
              <View style={styles.childrenList}>
                {childrenList.map((child) => {
                  const isActive = activeChild?.id === child.id;
                  const isSelected = selectedChildId === child.id;
                  return (
                    <TouchableOpacity
                      key={child.id}
                      onPress={() => setSelectedChildId(child.id)}
                      style={[
                        styles.childItemRow,
                        isActive && styles.childItemRowActive,
                        isSelected && styles.childItemRowSelected,
                      ]}
                    >
                      <View style={[styles.miniAvatar, { backgroundColor: getAvatarBgColor(child.avatar) }]}>
                        <Text style={styles.miniAvatarText}>{getAvatarEmoji(child.avatar)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.childNameText, isActive && styles.activeChildText]}>
                          {child.name} {isActive && '🌟'}
                        </Text>
                        <Text style={styles.childAgeText}>Age {child.age} • Group {child.ageGroup}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </AppCard>

            {/* Audio Settings */}
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>Audio Configuration</Text>
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
            </AppCard>

            {/* Reset Progress Section */}
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

            <AppButton
              label="Log Out"
              onPress={handleLogout}
              variant="secondary"
              style={styles.logoutBtn}
            />

          </View>
        </ScrollView>

        {/* Right Side: Selected Profile details */}
        <View style={styles.sidebar}>
          {selectedChild ? (
            <View style={styles.sidebarDetails}>
              <Text style={styles.sidebarTitle}>Profile Details</Text>
              
              <AppCard style={styles.sidebarCard} outlined>
                <View style={[styles.circle, { backgroundColor: getAvatarBgColor(selectedChild.avatar) }]}>
                  <Text style={styles.circleLetter}>{getAvatarEmoji(selectedChild.avatar)}</Text>
                </View>
                <Text style={styles.sidebarChildName}>{selectedChild.name}</Text>
                <Text style={styles.sidebarChildAge}>Age {selectedChild.age} ({selectedChild.ageGroup})</Text>

                {selectedChild.mentor ? (
                  <View style={styles.mentorBrief}>
                    <Text style={styles.mentorBriefLabel}>COMPANION</Text>
                    <View style={styles.mentorBriefRow}>
                      <View style={[styles.mentorIconCircle, { backgroundColor: getMentorColor(selectedChild.mentor.characterType) }]}>
                        <Ionicons name="paw" size={18} color={colors.white} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mentorBriefName}>{selectedChild.mentor.name}</Text>
                        <Text style={styles.mentorBriefDesc} numberOfLines={2}>{selectedChild.mentor.description}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noMentorText}>No companion chosen</Text>
                )}
              </AppCard>

              <View style={styles.sidebarActions}>
                {activeChild?.id !== selectedChild.id && (
                  <AppButton
                    label="Switch to Active Child"
                    onPress={() => setActiveChild(selectedChild)}
                    variant="primary"
                  />
                )}
                <AppButton
                  label="Edit Profile Details"
                  onPress={() => navigation.navigate('AddChild', { childId: selectedChild.id })}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <View style={styles.noSelectionContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={styles.noSelectionText}>Select a child profile to manage settings.</Text>
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
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
    minHeight: 32,
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
  childItemRowSelected: {
    borderColor: colors.purple,
    borderWidth: 1.5,
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
  logoutBtn: {
    marginTop: spacing.md,
    backgroundColor: '#374151',
  },
  sidebar: {
    width: 320,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
  },
  sidebarDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  sidebarCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  circleLetter: {
    fontSize: 36,
  },
  sidebarChildName: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  sidebarChildAge: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  mentorBrief: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  mentorBriefLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  mentorBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  mentorBriefName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  mentorBriefDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  noMentorText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
  },
  sidebarActions: {
    gap: spacing.sm,
  },
  noSelectionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSelectionText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
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


export default ProfileTablet;
