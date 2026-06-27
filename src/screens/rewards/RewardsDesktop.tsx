import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader, Card } from '../../components/ui';
import { RewardCard } from '../../components/cards/RewardCard';
import { spacing, colors, typography, radius, shadows } from '../../theme';
import { useRewardsStore } from '../../store/rewardsStore';
import { useChildStore } from '../../store/childStore';

export const RewardsDesktop: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const { totalStars, stickers, badges, loading, error, refreshRewards } = useRewardsStore();
  const [activeTab, setActiveTab] = useState<'stickers' | 'badges'>('stickers');

  useEffect(() => {
    refreshRewards();
  }, []);

  const unlockedStickersCount = stickers.filter(s => s.unlocked).length;
  const earnedBadgesCount = badges.filter(b => b.earned).length;
  const childName = activeChild?.name || 'Explorer';

  return (
    <ScreenContainer>
      <View style={styles.layout}>
        {/* Left Side: Badges & Stickers Grid */}
        <ScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <SectionHeader
            title="Earned Trophies"
            subtitle="Complete tasks and play learning activities to unlock rewards!"
          />

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => setActiveTab('stickers')}
              style={[styles.tab, activeTab === 'stickers' && styles.activeTab]}
            >
              <Text style={[
                styles.tabText, 
                activeTab === 'stickers' && styles.activeTabText,
                { fontFamily: typography.families.rounded }
              ]}>Stickers</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('badges')}
              style={[styles.tab, activeTab === 'badges' && styles.activeTab]}
            >
              <Text style={[
                styles.tabText, 
                activeTab === 'badges' && styles.activeTabText,
                { fontFamily: typography.families.rounded }
              ]}>Badges</Text>
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

        {/* Right Side: Lion Purple Hero Card & Stats Summary */}
        <View style={styles.sidebar}>
          <Text style={[styles.sidebarTitle, { fontFamily: typography.families.rounded }]}>Star Bank</Text>
          
          <Card style={styles.purpleHeroCard}>
            <View style={styles.heroContent}>
              <Text style={styles.heroEmoji}>🦁</Text>
              <Text style={[styles.heroName, { fontFamily: typography.families.rounded }]}>{childName}'s Stars</Text>
              <Text style={[styles.heroCount, { fontFamily: typography.families.rounded }]}>{totalStars} ⭐</Text>
              <Text style={[styles.heroSubText, { fontFamily: typography.families.rounded }]}>Keep shining!</Text>
            </View>
          </Card>

          <Card style={styles.statsBox}>
            <Text style={[styles.statsHeader, { fontFamily: typography.families.rounded }]}>Stickers Unlocked</Text>
            <Text style={[styles.statsValue, { fontFamily: typography.families.rounded }]}>{unlockedStickersCount} / {stickers.length}</Text>
            
            <View style={styles.divider} />
            
            <Text style={[styles.statsHeader, { fontFamily: typography.families.rounded }]}>Badges Earned</Text>
            <Text style={[styles.statsValue, { fontFamily: typography.families.rounded }]}>{earnedBadgesCount} / {badges.length}</Text>
          </Card>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1.2,
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
    backgroundColor: colors.border,
    borderRadius: radius.card,
    padding: 4,
    gap: 4,
    maxWidth: 400,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.button,
  },
  activeTab: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  activeTabText: {
    color: colors.purple,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '31%', // three items per row with gap
  },
  sidebar: {
    width: 320,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sidebarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
  },
  purpleHeroCard: {
    backgroundColor: colors.purple,
    borderColor: '#7C68B8',
    borderWidth: 2,
    alignItems: 'center',
    padding: spacing.md,
  },
  heroContent: {
    alignItems: 'center',
    gap: 4,
  },
  heroEmoji: {
    fontSize: 64,
  },
  heroName: {
    color: '#E6DAC4',
    fontSize: typography.sizes.caption,
    fontWeight: 'bold',
  },
  heroCount: {
    color: '#FFF8ED',
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroSubText: {
    color: '#E6DAC4',
    fontSize: 10,
  },
  statsBox: {
    padding: spacing.md,
  },
  statsHeader: {
    color: colors.purple,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  statsValue: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  divider: {
    height: 1.5,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  errorText: {
    color: colors.coral,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
export default RewardsDesktop;
