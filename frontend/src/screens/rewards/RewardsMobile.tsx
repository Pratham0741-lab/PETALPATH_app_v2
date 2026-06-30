import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { useRewardsStore } from '../../store/rewardsStore';
import { useChildStore } from '../../store/childStore';
import { Card, SectionHeader } from '../../components/ui';
import { RewardCard } from '../../components/cards/RewardCard';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

export const RewardsMobile: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const { totalStars, stickers, badges, loading, error, refreshRewards } = useRewardsStore();
  const [activeTab, setActiveTab] = useState<'stickers' | 'badges'>('stickers');

  useEffect(() => {
    refreshRewards();
  }, []);

  const childName = activeChild?.name || 'Explorer';

  return (
    <ScreenContainer>
      <TopBar title="My Rewards" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* LION PURPLE HERO CARD */}
        <Card style={styles.purpleHeroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroTextSection}>
              <Text style={[styles.heroBadge, { fontFamily: typography.families.rounded }]}>LION MENTOR'S TREASURE</Text>
              <Text style={[styles.heroTitle, { fontFamily: typography.families.rounded }]}>{childName}'s Star Bank</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>⭐ Stars</Text>
                  <Text style={[styles.statValue, { fontFamily: typography.families.rounded }]}>{totalStars}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>💖 Hearts</Text>
                  <Text style={[styles.statValue, { fontFamily: typography.families.rounded }]}>{totalStars === 0 ? 0 : 8}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>🌸 Petals</Text>
                  <Text style={[styles.statValue, { fontFamily: typography.families.rounded }]}>{totalStars === 0 ? 0 : 12}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.heroEmoji}>🦁</Text>
          </View>
        </Card>

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
          <View style={styles.list}>
            <SectionHeader
              title={activeTab === 'stickers' ? 'Magical Stickers' : 'Learning Badges'}
              subtitle={activeTab === 'stickers' ? 'Collect stars to unlock cute forest animals!' : 'Earned by completing subject paths!'}
            />
            {activeTab === 'stickers'
              ? stickers.map((s) => (
                  <RewardCard
                    key={s.id}
                    title={s.name}
                    description={s.description || `Unlocks at ${s.requiredStars} stars`}
                    starValue={s.requiredStars}
                    unlocked={s.unlocked}
                    style={styles.card}
                  />
                ))
              : badges.map((b) => (
                  <RewardCard
                    key={b.id}
                    title={b.name}
                    description={b.description || 'Complete activities to earn this badge'}
                    unlocked={b.earned}
                    style={styles.card}
                  />
                ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 100,
  },
  purpleHeroCard: {
    backgroundColor: colors.purple,
    borderColor: '#7C68B8',
    borderWidth: 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextSection: {
    flex: 1.2,
    gap: spacing.xs,
  },
  heroBadge: {
    color: '#E6DAC4',
    fontSize: 10,
    fontWeight: typography.weights.black,
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#FFF8ED',
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.black,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  statItem: {
    backgroundColor: 'rgba(255, 248, 237, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statLabel: {
    color: '#E6DAC4',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statValue: {
    color: '#FFF8ED',
    fontSize: typography.sizes.body,
    fontWeight: 'bold',
    marginTop: 2,
  },
  heroEmoji: {
    fontSize: 72,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
    borderRadius: radius.card,
    padding: 4,
    gap: 4,
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
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.xs,
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
export default RewardsMobile;
