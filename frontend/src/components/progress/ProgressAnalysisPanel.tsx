import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, GrownUpGate, PetalIcon } from '../design';
import { useGradeProgress } from '../../hooks/useCurriculum';
import { toUserMessage } from '../../api/errors';
import { colors, radius, spacing, typography } from '../../theme';
import { AccuracyChart, BeforeAfterChart, MasteryTimelineChart } from './ProgressCharts';
import { PetalMark } from '../brand/PetalMark';

/**
 * The parent-locked analysis behind Explore.
 *
 * The child sees only a lock tile ("For grown-ups"); tapping it raises the
 * `GrownUpGate`, and only once that is passed are the three charts fetched and
 * shown. The data hook stays disabled until then, so the child's Explore never
 * so much as requests the numbers. Unlock is per-visit (state here), which is
 * the right default for a shared family device — leaving means re-gating.
 */
export const ProgressAnalysisPanel: React.FC = () => {
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const { data, isLoading, isError, error, refetch } = useGradeProgress(unlocked);
  const progress = data?.data;

  if (!unlocked) {
    return (
      <>
        <Pressable
          onPress={() => setGateOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="For grown-ups: see progress charts"
          accessibilityHint="Opens a parent gate"
          style={({ pressed }) => [styles.lockTile, pressed && styles.pressed]}
        >
          <View style={styles.lockIcon}>
            <PetalIcon name="parent" size={22} color={colors.primary} />
          </View>
          <View style={styles.lockText}>
            <Text style={[typography.presets.cardTitle, styles.lockTitle]}>For grown-ups</Text>
            <Text style={[typography.presets.caption, styles.muted]}>
              Accuracy, growth over time and before/after — tap to unlock
            </Text>
          </View>
          <PetalIcon name="lock" size={18} color={colors.textSecondary} />
        </Pressable>

        <GrownUpGate
          visible={gateOpen}
          onCancel={() => setGateOpen(false)}
          onUnlock={() => {
            setGateOpen(false);
            setUnlocked(true);
          }}
        />
      </>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[typography.presets.section, styles.headerTitle]}>Progress analysis</Text>
        <Pressable onPress={() => setUnlocked(false)} accessibilityRole="button" accessibilityLabel="Lock again">
          <PetalIcon name="lock" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {progress?.grade ? (
        <Text style={[typography.presets.caption, styles.muted]}>{progress.grade.title}</Text>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <PetalMark size={64} loading />
        </View>
      ) : isError ? (
        <Card>
          <Text style={[typography.presets.body, styles.muted]}>{toUserMessage(error)}</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={[typography.presets.caption, styles.retry]}>Try again</Text>
          </Pressable>
        </Card>
      ) : progress ? (
        <>
          <ChartCard title="Accuracy by subject">
            <AccuracyChart rows={progress.accuracyBySubject} />
          </ChartCard>
          <ChartCard title="Mastery over time">
            <MasteryTimelineChart points={progress.masteryTimeline} />
          </ChartCard>
          <ChartCard title="Before & now">
            <BeforeAfterChart
              overall={progress.beforeAfter.overall}
              rows={progress.beforeAfter.bySubject}
            />
          </ChartCard>
        </>
      ) : null}
    </View>
  );
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card style={styles.chartCard}>
    <Text style={[typography.presets.cardTitle, styles.chartTitle]}>{title}</Text>
    {children}
  </Card>
);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
  },
  lockTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    flex: 1,
    minWidth: 0,
  },
  lockTitle: {
    color: colors.text,
  },
  muted: {
    color: colors.textSecondary,
  },
  chartCard: {
    marginTop: spacing.sm,
  },
  chartTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  center: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  retry: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
