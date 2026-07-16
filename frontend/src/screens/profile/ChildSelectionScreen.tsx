import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/layout/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useChildStore, type Child } from '../../store/childStore';
import { useDeviceType } from '../../hooks/useDeviceType';
import { useApiQuery, useApiMutation } from '../../hooks/useReactQuery';
import { queryKeys } from '../../utils/queryKeys';
import { apiClient } from '../../services/api/apiClient';
import { storageService, StorageKeys } from '../../services/storage';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import type { ApiResponse } from '../../types/api';
import { customAlert } from '../../utils/alert';

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
  const { activeChild, setActiveChild, removeChild, refreshChildren } = useChildStore();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [switchAnim] = useState(() => new Animated.Value(1));

  const {
    data: childrenResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useApiQuery(
    queryKeys.children.all,
    () => apiClient.get<ApiResponse<Child[]>>('/children'),
  );

  const childrenList = childrenResponse?.data ?? [];

  React.useEffect(() => {
    if (childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList, selectedChildId]);

  const selectChildMutation = useApiMutation(
    async (child: Child) => {
      const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/select-child', { childId: child.id });
      return response;
    },
  );

  const handleSelectChild = useCallback(async (child: Child) => {
    Animated.sequence([
      Animated.timing(switchAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(switchAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    try {
      await selectChildMutation.mutateAsync(child);
    } catch {
      // selection API failure is non-blocking
    }
    await setActiveChild(child);
    await storageService.setItem(StorageKeys.ACTIVE_CHILD, child);

    customAlert('Active Child Set', `Welcome back, ${child.name}!`, [
      {
        text: 'OK',
        onPress: () => {
          if (deviceType === 'mobile') {
            navigation.navigate('MainTabs');
          } else {
            navigation.navigate('Home');
          }
        },
      },
    ]);
  }, [deviceType, navigation, selectChildMutation, setActiveChild, switchAnim]);

  const handleDeleteChild = useCallback((id: string, name: string) => {
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
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete child';
              customAlert('Error', message);
            }
          },
        },
      ],
    );
  }, [removeChild, selectedChildId, childrenList]);

  const onRefresh = useCallback(() => {
    refreshChildren();
    refetch();
  }, [refreshChildren, refetch]);

  const renderSkeletons = (count: number) => (
    <View style={styles.listContainer}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton variant="circle" width={48} height={48} />
          <View style={styles.skeletonTextGroup}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      ))}
    </View>
  );

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
        accessibilityRole="button"
        accessibilityLabel={`${child.name}, age ${child.age}`}
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>No Child Profiles Yet</Text>
      <Text style={styles.emptyText}>
        Create a profile for your child to start their learning journey!
      </Text>
      <Button
        label="Add Your First Child"
        onPress={() => navigation.navigate('AddChild')}
        variant="primary"
        style={styles.emptyBtn}
      />
    </View>
  );

  const renderMobile = () => {
    if (isLoading) {
      return (
        <Screen scroll padded>
          <View style={styles.header}>
            <Skeleton width="70%" height={24} />
            <Skeleton width="50%" height={14} style={{ marginTop: spacing.sm }} />
          </View>
          {renderSkeletons(3)}
        </Screen>
      );
    }

    return (
      <Screen
        scroll
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={[colors.purple]}
            tintColor={colors.purple}
          />
        }
      >
        <View style={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Who is learning today? 🌸</Text>
            <Text style={styles.subtitle}>Select a child profile to get started</Text>
          </View>

          {childrenList.length === 0 ? renderEmptyState() : (
            <View style={styles.listContainer}>
              {childrenList.map((child) => renderChildItem(child, false))}
              <Button
                label="Add Another Child"
                onPress={() => navigation.navigate('AddChild')}
                variant="outline"
                style={styles.addBtn}
              />
            </View>
          )}
        </View>
      </Screen>
    );
  };

  const renderTablet = () => {
    const selectedChild = childrenList.find((c) => c.id === selectedChildId);

    return (
      <View style={styles.splitWrapper}>
        <View style={styles.splitLeft}>
          <Text style={styles.sectionHeader}>Child Profiles</Text>
          {isLoading ? (
            renderSkeletons(3)
          ) : childrenList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No profiles found.</Text>
              <Button
                label="Create Profile"
                onPress={() => navigation.navigate('AddChild')}
                variant="primary"
                size="sm"
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={onRefresh}
                  colors={[colors.purple]}
                  tintColor={colors.purple}
                />
              }
            >
              {childrenList.map((child) => renderChildItem(child, child.id === selectedChildId))}
              <Button
                label="Add Profile"
                onPress={() => navigation.navigate('AddChild')}
                variant="outline"
                style={styles.addBtn}
              />
            </ScrollView>
          )}
        </View>

        <View style={styles.splitRight}>
          {selectedChild ? (
            <Animated.View style={{ transform: [{ scale: switchAnim }] }}>
              <View style={styles.detailsContainer}>
                <View style={styles.detailsHeader}>
                  <View style={[styles.largeAvatarCircle, { backgroundColor: getAvatarBgColor(selectedChild.avatar) }]}>
                    <Text style={styles.largeAvatarEmoji}>{getAvatarEmoji(selectedChild.avatar)}</Text>
                  </View>
                  <Text style={styles.detailName}>{selectedChild.name}</Text>
                  <Text style={styles.detailAge}>{selectedChild.ageGroup} ({selectedChild.age} years old)</Text>
                </View>

                <Card variant="outlined" style={styles.mentorDetailCard}>
                  <Text style={styles.detailCardLabel}>Active Companion</Text>
                  {selectedChild.mentor ? (
                    <View style={styles.mentorBriefRow}>
                      <View style={[styles.smallIconCircle, { backgroundColor: colors.purple }]}>
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
                </Card>

                <View style={styles.actionsGroup}>
                  <Button
                    label="Select Profile & Start Learning"
                    onPress={() => handleSelectChild(selectedChild)}
                    variant="primary"
                    fullWidth
                  />
                  <View style={styles.row}>
                    <Button
                      label="Edit Profile"
                      onPress={() => navigation.navigate('AddChild', { childId: selectedChild.id })}
                      variant="outline"
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Delete Profile"
                      onPress={() => handleDeleteChild(selectedChild.id, selectedChild.name)}
                      variant="danger"
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.noSelectionContainer}>
              <Ionicons name={"child-outline" as any} size={48} color={colors.textMuted} />
              <Text style={styles.noSelectionText}>Select a child profile to view details</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDesktop = () => renderTablet();

  const renderLayout = () => {
    switch (deviceType) {
      case 'mobile': return renderMobile();
      case 'tablet': return renderTablet();
      case 'desktop': return renderDesktop();
    }
  };

  return renderLayout();
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: typography.lineHeights.sm,
  },
  emptyBtn: {
    width: '100%',
    maxWidth: 240,
  },
  listContainer: {
    gap: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  skeletonTextGroup: {
    flex: 1,
    gap: spacing.xs,
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
    gap: spacing.md,
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
