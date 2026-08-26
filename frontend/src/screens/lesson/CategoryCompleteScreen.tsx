/**
 * Category Completed — the biggest milestone in the journey (spec §34 phase 6).
 *
 * Reached only from `LessonCompleteScreen.handleFinish` when the backend reports
 * `categoryCompleted`, with `categoryTitle` and the badge name resolved from
 * `categoryBadgeMap`. Both params stay optional and both fallbacks are kept (§1),
 * and the two navigations — Rewards and Home — are unchanged.
 *
 * The chrome now comes from `CelebrationScaffold`. That retires the 160px hero
 * circle (which alone was taller than the title on a 360px screen), the 32px
 * one-off title size and the four `colors.primary + '10'`-style hex-alpha
 * suffixes, which produced pink washes at four different opacities across the
 * three completion screens.
 *
 * The badge itself is now a real `RewardCard` — the same component the Rewards
 * screen uses — so an earned badge looks the same wherever a child meets it (§28).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';

import { colors, spacing } from '../../theme';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useChildStore } from '../../store/childStore';
import { PrimaryButton, RewardCard, SecondaryButton } from '../../components/design';
import { CelebrationScaffold } from './CelebrationScaffold';

export const CategoryCompleteScreen: React.FC = () => {
  const { navigateToTab } = useAppNavigation();
  const route = useRoute<any>();
  const activeChild = useChildStore((state) => state.activeChild);

  const { categoryTitle, badgeName } = route.params || {};

  const handleContinue = () => {
    navigateToTab('Home');
  };

  return (
    <CelebrationScaffold
      icon="trophy"
      iconColor={colors.yellow}
      iconSoft={colors.yellowSoft}
      /* A shade larger than a lesson or module — this is the rarest moment. */
      iconSize={112}
      title="Incredible!"
      message={`Spectacular achievement${activeChild?.name ? `, ${activeChild.name}` : ''}! You completed the entire “${categoryTitle || 'Category'}” curriculum path!`}
      footer={
        <View style={styles.footer}>
          <SecondaryButton
            label="View Rewards"
            icon="trophy"
            onPress={() => navigateToTab('Rewards')}
          />
          <PrimaryButton
            label="Go to Home"
            iconRight="forward"
            tone="green"
            onPress={handleContinue}
            accessibilityHint="Goes back to your learning journey"
          />
        </View>
      }
    >
      {badgeName ? (
        <RewardCard
          title={badgeName}
          description="New badge earned — find it in My Rewards."
          kind="badge"
          unlocked
          onPress={() => navigateToTab('Rewards')}
        />
      ) : null}
    </CelebrationScaffold>
  );
};

const styles = StyleSheet.create({
  footer: {
    gap: spacing.sm,
  },
});

export default CategoryCompleteScreen;
