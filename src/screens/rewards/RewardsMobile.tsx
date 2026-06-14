import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { useFocusEffect } from '@react-navigation/native';
import { useRewardsStore } from '../../store/rewardsStore';
import { RewardCard } from '../../components/cards/RewardCard';
import { colors, spacing, radius, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useChildStore } from '../../store/childStore';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

export const RewardsMobile: React.FC = () => {
  const activeChild = useChildStore((state) => state.activeChild);
  const { totalStars, stickers, badges, loading, error, refreshRewards } = useRewardsStore();
  const [activeTab, setActiveTab] = useState<'stickers' | 'badges'>('stickers');

  const tabRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);

  const measureTarget = () => {
    if (tabRef.current) {
      tabRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setHandCoords({ x: x + width / 2, y: y + height / 2 });
        }
      });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshRewards();
      const timer = setTimeout(measureTarget, 300);
      return () => clearTimeout(timer);
    }, [refreshRewards])
  );

  return (
    <ScreenContainer>
      <TopBar title="My Rewards" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Wallet Overview Panel */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Ionicons name="star" size={32} color={colors.yellow} />
            <View>
              <Text style={styles.walletTitle}>{activeChild?.name || 'Buddy'}'s Star Bank</Text>
              <Text style={styles.walletCount}>{totalStars} Stars</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            ref={tabRef as any}
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
          <View style={styles.list}>
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
      <NavigationGuide
        screenKey="rewards"
        guideKey="reward"
        message="Look at your rewards!"
        showHand={!!handCoords}
        handMode="tap"
        handX={handCoords?.x}
        handY={handCoords?.y}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  walletCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  walletTitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
  },
  walletCount: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    backgroundColor: colors.border + '30',
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
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
    color: '#FF4A4A',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
