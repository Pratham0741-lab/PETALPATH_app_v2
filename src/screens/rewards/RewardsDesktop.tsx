import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { RewardCard } from '../../components/cards/RewardCard';
import { spacing, colors, typography, radius } from '../../theme';
import { useFocusEffect } from '@react-navigation/native';
import { useRewardsStore } from '../../store/rewardsStore';
import { useChildStore } from '../../store/childStore';

export const RewardsDesktop: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const { totalStars, stickers, badges, loading, error, refreshRewards } = useRewardsStore();
  const [activeTab, setActiveTab] = useState<'stickers' | 'badges'>('stickers');

  useFocusEffect(
    React.useCallback(() => {
      refreshRewards();
    }, [refreshRewards])
  );

  const unlockedStickersCount = stickers.filter(s => s.unlocked).length;
  const earnedBadgesCount = badges.filter(b => b.earned).length;

  return (
    <ScreenContainer>
      <View style={styles.layout}>
        {/* Left Side: Badges & Stickers Grid */}
        <ScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <SectionHeader
            title="Earned Trophies"
            subtitle="Help Dax, Penny, and friends to unlock everything!"
          />

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => setActiveTab('stickers')}
              style={[styles.tab, activeTab === 'stickers' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'stickers' && styles.activeTabText]}>Stickers</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('badges')}
              style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === 'badges' && styles.activeTabText]}>Badges</Text>
            </Pressable>
          </View>

          {loading && stickers.length === 0 ? (
            <ActivityIndicator size="large" color={colors.purple} style={styles.loader} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <View style={styles.grid}>
              {activeTab === 'stickers'
                ? stickers.map((s) => (
                    <RewardCard
                      key={s.id}
                      title={s.name}
                      description={s.description || `Requires ${s.requiredStars} stars`}
                      starValue={s.requiredStars}
                      unlocked={s.unlocked}
                      style={styles.gridItem}
                    />
                  ))
                : badges.map((b) => (
                    <RewardCard
                      key={b.id}
                      title={b.name}
                      description={b.description || 'Earned through milestones'}
                      unlocked={b.earned}
                      style={styles.gridItem}
                    />
                  ))}
            </View>
          )}
        </ScrollView>

        {/* Right Side: Quick Stats summary */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Reward Stats</Text>
          <View style={styles.statsBox}>
            <Text style={styles.statsHeader}>Your Wallet</Text>
            <Text style={styles.statsValue}>{totalStars} Stars</Text>
            <View style={styles.divider} />
            <Text style={styles.statsHeader}>Stickers Unlocked</Text>
            <Text style={styles.statsValue}>{unlockedStickersCount} / {stickers.length}</Text>
            <View style={styles.divider} />
            <Text style={styles.statsHeader}>Badges Earned</Text>
            <Text style={styles.statsValue}>{earnedBadgesCount} / {badges.length}</Text>
          </View>
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
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.border + '30',
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
    maxWidth: 400,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  activeTab: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  activeTabText: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  gridItem: {
    width: '31%', // three items per row with gap
  },
  sidebar: {
    width: 320,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  statsBox: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsHeader: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  statsValue: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  errorText: {
    color: '#FF4A4A',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
