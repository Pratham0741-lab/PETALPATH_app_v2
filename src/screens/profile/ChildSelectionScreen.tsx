import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { useChildStore, Child } from '../../store/childStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { getMentorColor } from '../../constants/mentors';

import { customAlert } from '../../utils/alert';

// Predefined static avatar IDs mapped to visual indicators
export const AVATAR_ASSETS = [
  { id: 'avatar_panda', label: 'Panda', icon: '🐼', color: '#F3F4F6' },
  { id: 'avatar_bunny', label: 'Bunny', icon: '🐰', color: '#FEF3C7' },
  { id: 'avatar_cat', label: 'Cat', icon: '🐱', color: '#FCE7F3' },
  { id: 'avatar_fox', label: 'Fox', icon: '🦊', color: '#FFEDD5' },
  { id: 'avatar_tiger', label: 'Tiger', icon: '🐯', color: '#FFE4E6' },
  { id: 'avatar_bear', label: 'Bear', icon: '🐻', color: '#EED5C5' },
];

export const getAvatarEmoji = (avatarId: string): string => {
  const av = AVATAR_ASSETS.find((a) => a.id === avatarId);
  return av ? av.icon : '👶';
};

export const getAvatarBgColor = (avatarId: string): string => {
  const av = AVATAR_ASSETS.find((a) => a.id === avatarId);
  return av ? av.color : '#E5E7EB';
};

export const ChildSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const deviceType = useDeviceType();
  
  const { childrenList, loading, refreshChildren, setActiveChild, removeChild, activeChild } = useChildStore();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    refreshChildren();
  }, []);

  useEffect(() => {
    // Default select first child in local detail panel
    if (childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList]);

  const handleSelectChild = async (child: Child) => {
    await setActiveChild(child);
    customAlert('Active Child Set', `Welcome back, ${child.name}!`, [
      {
        text: 'OK',
        onPress: () => {
          if (deviceType === 'mobile') {
            navigation.navigate('MainTabs');
          } else {
            navigation.navigate('Home');
          }
        }
      }
    ]);
  };

  const handleDeleteChild = (id: string, name: string) => {
    customAlert(
      'Delete Profile',
      `Are you sure you want to delete ${name}'s profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeChild(id);
              if (selectedChildId === id) {
                setSelectedChildId(childrenList[0]?.id || null);
              }
              customAlert('Success', 'Profile deleted successfully');
            } catch (err: any) {
              customAlert('Error', err.message || 'Failed to delete child');
            }
          }
        }
      ]
    );
  };

  const renderChildItem = (child: Child, isSelectedDetail: boolean) => {
    const isCurrentlyActive = activeChild?.id === child.id;
    return (
      <TouchableOpacity
        key={child.id}
        onPress={() => {
          if (deviceType === 'mobile') {
            handleSelectChild(child);
          } else {
            setSelectedChildId(child.id);
          }
        }}
        style={[
          styles.childItem,
          isSelectedDetail && styles.childItemDetailSelected,
          isCurrentlyActive && styles.childItemActive,
        ]}
      >
        <View style={[styles.avatarCircle, { backgroundColor: getAvatarBgColor(child.avatar) }]}>
          <Text style={styles.avatarEmoji}>{getAvatarEmoji(child.avatar)}</Text>
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childSub}>{child.ageGroup} • {child.mentor?.name || 'No Mentor selected'}</Text>
        </View>
        {isCurrentlyActive && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>Active</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  // 1. Mobile Layout (Single Column)
  const renderMobile = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Who is learning today? 🌸</Text>
          <Text style={styles.subtitle}>Select a child profile to get started</Text>
        </View>

        {loading && childrenList.length === 0 ? (
          <ActivityIndicator size="large" color={colors.purple} style={styles.loader} />
        ) : childrenList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No child profiles found yet.</Text>
            <AppButton
              label="Add Your First Child"
              onPress={() => navigation.navigate('AddChild')}
              variant="accent"
              style={styles.emptyBtn}
            />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {childrenList.map((child) => renderChildItem(child, false))}
            
            <AppButton
              label="Add Another Child"
              onPress={() => navigation.navigate('AddChild')}
              variant="secondary"
              style={styles.addBtn}
            />
          </View>
        )}
      </ScrollView>
    );
  };

  // 2. Tablet Layout (Two Column)
  const renderTablet = () => {
    const selectedChild = childrenList.find((c) => c.id === selectedChildId);
    return (
      <View style={styles.splitWrapper}>
        {/* Left Column: Children list */}
        <View style={styles.splitLeft}>
          <Text style={styles.sectionHeader}>Child Profiles</Text>
          {loading && childrenList.length === 0 ? (
            <ActivityIndicator size="large" color={colors.purple} style={styles.loader} />
          ) : childrenList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No profiles found.</Text>
              <AppButton
                label="Create Profile"
                onPress={() => navigation.navigate('AddChild')}
                variant="accent"
              />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {childrenList.map((child) => renderChildItem(child, child.id === selectedChildId))}
              <AppButton
                label="Add Profile"
                onPress={() => navigation.navigate('AddChild')}
                variant="secondary"
                style={styles.addBtn}
              />
            </ScrollView>
          )}
        </View>

        {/* Right Column: Profile Details & Actions */}
        <View style={styles.splitRight}>
          {selectedChild ? (
            <View style={styles.detailsContainer}>
              <View style={styles.detailsHeader}>
                <View style={[styles.largeAvatarCircle, { backgroundColor: getAvatarBgColor(selectedChild.avatar) }]}>
                  <Text style={styles.largeAvatarEmoji}>{getAvatarEmoji(selectedChild.avatar)}</Text>
                </View>
                <Text style={styles.detailName}>{selectedChild.name}</Text>
                <Text style={styles.detailAge}>{selectedChild.ageGroup} ({selectedChild.age} years old)</Text>
              </View>

              <AppCard style={styles.mentorDetailCard} outlined>
                <Text style={styles.detailCardLabel}>Active Companion</Text>
                {selectedChild.mentor ? (
                  <View style={styles.mentorBriefRow}>
                    <View style={[styles.smallIconCircle, { backgroundColor: getMentorColor(selectedChild.mentor.characterType) }]}>
                      <Ionicons name="paw" size={18} color={colors.white} />
                    </View>
                    <View style={styles.mentorBriefInfo}>
                      <Text style={styles.mentorBriefName}>{selectedChild.mentor.name}</Text>
                      <Text style={styles.mentorBriefDesc}>{selectedChild.mentor.description}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noMentorText}>No companion selected yet.</Text>
                )}
              </AppCard>

              <View style={styles.actionsGroup}>
                <AppButton
                  label="Select Profile & Start Learning"
                  onPress={() => handleSelectChild(selectedChild)}
                  variant="primary"
                />
                <View style={styles.row}>
                  <AppButton
                    label="Edit Profile"
                    onPress={() => navigation.navigate('AddChild', { childId: selectedChild.id })}
                    variant="secondary"
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    label="Delete Profile"
                    onPress={() => handleDeleteChild(selectedChild.id, selectedChild.name)}
                    variant="secondary"
                    style={{ flex: 1, backgroundColor: '#EF4444' }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noSelectionContainer}>
              <Text style={styles.noSelectionText}>Select a child profile to view details</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // 3. Desktop Layout (Three Panel)
  const renderDesktop = () => {
    return renderTablet(); // Shares the robust split view on desktop viewport
  };

  const renderLayout = () => {
    switch (deviceType) {
      case 'mobile': return renderMobile();
      case 'tablet': return renderTablet();
      case 'desktop': return renderDesktop();
    }
  };

  return <ScreenContainer>{renderLayout()}</ScreenContainer>;
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  emptyBtn: {
    width: '100%',
    maxWidth: 240,
  },
  listContainer: {
    gap: spacing.md,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  childItemDetailSelected: {
    borderColor: colors.purple,
    borderWidth: 2,
    backgroundColor: '#F5ECFF',
  },
  childItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.blue,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  childSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  activeBadge: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  activeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  addBtn: {
    marginTop: spacing.md,
  },
  splitWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  splitLeft: {
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  sectionHeader: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  splitRight: {
    flex: 1.8,
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
  },
  noSelectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSelectionText: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    fontStyle: 'italic',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  detailsHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  largeAvatarCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  largeAvatarEmoji: {
    fontSize: 48,
  },
  detailName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detailAge: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  mentorDetailCard: {
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  detailCardLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  mentorBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  mentorBriefInfo: {
    flex: 1,
  },
  mentorBriefName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  mentorBriefDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  noMentorText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontStyle: 'italic',
  },
  actionsGroup: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});

export default ChildSelectionScreen;
