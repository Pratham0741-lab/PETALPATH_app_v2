/**
 * Module Completed — the milestone between lessons and a finished category
 * (spec §34 phase 6).
 *
 * Reached only from `LessonCompleteScreen.handleFinish` when the backend reports
 * `moduleCompleted`, with `moduleTitle` and `nextModuleTitle` as params. Both
 * remain optional and both fallbacks are kept, so a param-less push still shows
 * a sensible screen (§1).
 *
 * The chrome now comes from `CelebrationScaffold`, which replaces the 110px
 * `rgba(247, 201, 75, …)` circle, the `ribbon` glyph and the `height: 54` button
 * with the shared hero, `IconWell` and sticky `PrimaryButton`. The "next module
 * unlocked" note keeps its meaning but drops the two hardcoded purple rgba
 * washes — a genuine unlock is a *green* moment here, purple is reserved for
 * selection and progress (§3).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';

import { colors, spacing, typography } from '../../theme';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useChildStore } from '../../store/childStore';
import { Card, PetalIcon, PrimaryButton } from '../../components/design';
import { CelebrationScaffold } from './CelebrationScaffold';

export const ModuleCompleteScreen: React.FC = () => {
  const { navigateToTab } = useAppNavigation();
  const route = useRoute<any>();
  const activeChild = useChildStore((state) => state.activeChild);

  const { moduleTitle, nextModuleTitle } = route.params || {};

  const handleContinue = () => {
    navigateToTab('Home');
  };

  return (
    <CelebrationScaffold
      icon="medal"
      iconColor={colors.yellow}
      iconSoft={colors.yellowSoft}
      title="Superstar!"
      message={`Amazing work${activeChild?.name ? `, ${activeChild.name}` : ''}! You completed the “${moduleTitle || 'Module'}” module!`}
      footer={
        <PrimaryButton
          label="Continue Journey"
          iconRight="forward"
          onPress={handleContinue}
          accessibilityHint="Goes back to your learning journey"
        />
      }
    >
      {nextModuleTitle ? (
        <Card variant="raised" padding="normal" accent={colors.leafGreen} rail>
          <View style={styles.unlockRow}>
            {/* `sparkle`, not `lock` — the icon set has no open padlock, and a
                closed one next to the word "Unlocked" says the opposite thing. */}
            <PetalIcon name="sparkle" size={22} color={colors.leafGreen} filled />
            <View style={styles.unlockText}>
              <Text style={[typography.presets.eyebrow, styles.unlockLabel]}>Next Up Unlocked</Text>
              <Text style={[typography.presets.cardTitle, styles.unlockTitle]}>
                {nextModuleTitle}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
    </CelebrationScaffold>
  );
};

const styles = StyleSheet.create({
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  unlockText: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 2,
  },
  unlockLabel: {
    color: colors.leafGreen,
  },
  unlockTitle: {
    color: colors.text,
  },
});

export default ModuleCompleteScreen;
