import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { useWeeklyReport, useAnalyticsActivity } from '../../hooks/useParentAnalytics';
import { LearningTrendCard } from '../../components/analytics/LearningTrendCard';
import { BarChart } from '../../components/charts/BarChart';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatDuration } from '../../utils/formatters';

function HeaderSkeleton() {
  return (
    <View style={styles.header}>
      <Skeleton variant="circle" width={36} height={36} />
      <Skeleton width={180} height={24} style={{ marginLeft: spacing.sm }} />
      <View style={{ flex: 1 }} />
      <Skeleton width={80} height={36} borderRadius={radius.button} />
    </View>
  );
}

function StatsRowSkeleton() {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.statItem}>
          <Skeleton variant="circle" width={40} height={40} />
          <Skeleton width={48} height={20} style={{ marginTop: spacing.xs }} />
          <Skeleton width={64} height={12} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
}

function SectionSkeleton() {
  return (
    <Card style={styles.sectionCard}>
      <Skeleton width={120} height={18} />
      <View style={{ marginTop: spacing.md }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={14} style={{ marginTop: spacing.sm }} />
        ))}
      </View>
    </Card>
  );
}

function WeakSkillRow({ name, score }: { name: string; score: number }) {
  const { theme: { colors: themeColors } } = useTheme();
  const barColor = score < 30 ? themeColors.error : themeColors.warning;

  return (
    <View style={styles.weakSkillRow} accessibilityLabel={`${name}: ${Math.round(score)}%`}>
      <View style={styles.weakSkillTop}>
        <Text style={[styles.weakSkillName, { color: themeColors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.weakSkillScore, { color: barColor }]}>
          {Math.round(score)}%
        </Text>
      </View>
      <ProgressBar progress={score} color={barColor} />
    </View>
  );
}

export const WeeklyReportScreen: React.FC = () => {
  const { theme: { colors: themeColors } } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = useWeeklyReport();

  const {
    data: activityData,
    isLoading: activityLoading,
  } = useAnalyticsActivity('weekly');

  const report = useMemo(() => reportData?.data ?? null, [reportData]);

  const activityBuckets = useMemo(() => {
    return activityData?.data?.buckets ?? [];
  }, [activityData]);

  const chartData = useMemo(() => {
    return activityBuckets.map((b) => ({
      label: b.label,
      value: b.lessonCompletions,
    }));
  }, [activityBuckets]);

  const weekRange = useMemo(() => {
    if (!report) return '';
    const start = new Date(report.weekStart);
    const end = new Date(report.weekEnd);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmtDay = (d: Date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
    };
    return `${fmtDay(start)} – ${fmtDay(end)}, ${end.getFullYear()}`;
  }, [report]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleExport = useCallback(() => {
    Alert.alert('Export', 'Report export will be available in a future update.');
  }, []);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <HeaderSkeleton />
          <StatsRowSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
          <Card style={styles.sectionCard}>
            <Skeleton width={120} height={18} />
            <Skeleton width="100%" height={160} style={{ marginTop: spacing.md }} />
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <ErrorState
            title="Couldn't load weekly report"
            message={(error as Error)?.message ?? 'An error occurred loading the weekly report.'}
            onRetry={() => refetch()}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!report) {
    return (
      <ScreenContainer>
        <View style={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.primary}18` }]}>
              <Ionicons name="calendar" size={24} color={themeColors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Weekly Report</Text>
          </View>
          <EmptyState
            title="No report available"
            message="Complete more lessons this week to generate a report."
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        accessibilityLabel="Weekly Report Screen"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.primary}18` }]}>
            <Ionicons name="calendar" size={24} color={themeColors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Weekly Report</Text>
          <View style={{ flex: 1 }} />
          <Button
            title="Export"
            variant="outline"
            size="sm"
            onPress={handleExport}
            accessibilityLabel="Export report"
          />
        </View>

        <Card style={styles.weekRangeCard} accessibilityLabel={`Report week: ${weekRange}`}>
          <Ionicons name="calendar-outline" size={18} color={themeColors.textSecondary} />
          <Text style={[styles.weekRangeText, { color: themeColors.textSecondary }]}>
            {weekRange}
          </Text>
        </Card>

        <View style={styles.statsRow} accessibilityLabel="Weekly summary statistics" accessibilityRole="summary">
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: `${themeColors.primary}18` }]}>
              <Ionicons name="time" size={22} color={themeColors.primary} />
            </View>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {formatDuration(report.totalLearningMinutes)}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Learning</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: `${themeColors.success}18` }]}>
              <Ionicons name="checkmark-circle" size={22} color={themeColors.success} />
            </View>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {report.lessonsCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Lessons</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: `${themeColors.accent}18` }]}>
              <Ionicons name="play" size={22} color={themeColors.accent} />
            </View>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {report.activitiesCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Activities</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: `${themeColors.lavender}18` }]}>
              <Ionicons name="layers" size={22} color={themeColors.lavender} />
            </View>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {report.modulesCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Modules</Text>
          </View>
        </View>

        <Card style={styles.sectionCard} accessibilityLabel="Skills improved this week">
          <View style={styles.skillsImprovedRow}>
            <View style={[styles.statIconWrap, { backgroundColor: `${themeColors.success}18` }]}>
              <Ionicons name="trending-up" size={22} color={themeColors.success} />
            </View>
            <View style={styles.skillsImprovedContent}>
              <Text style={[styles.skillsImprovedValue, { color: themeColors.text }]}>
                {report.skillsImproved}
              </Text>
              <Text style={[styles.skillsImprovedLabel, { color: themeColors.textSecondary }]}>
                Skills Improved
              </Text>
            </View>
          </View>
        </Card>

        {report.weakSkills.length > 0 && (
          <Card
            style={styles.sectionCard}
            variant="outlined"
            accessibilityLabel="Weak skills section"
          >
            <View style={styles.weakSkillsHeader}>
              <Ionicons name="alert-circle" size={20} color={themeColors.warning} />
              <Text style={[styles.weakSkillsTitle, { color: themeColors.text }]}>
                Weak Skills
              </Text>
            </View>
            {report.weakSkills.map((skill) => (
              <WeakSkillRow key={skill.name} name={skill.name} score={skill.score} />
            ))}
          </Card>
        )}

        <LearningTrendCard
          trend={report.trend}
          changePercent={report.skillsImproved}
          style={styles.sectionCard}
        />

        {report.recommendations.length > 0 && (
          <Card style={styles.sectionCard} accessibilityLabel="Recommendations">
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Recommendations
            </Text>
            <View style={styles.recommendationsList}>
              {report.recommendations.map((rec, idx) => (
                <View key={`rec-${idx}`} style={styles.recommendationRow}>
                  <View style={[styles.bullet, { backgroundColor: themeColors.primary }]} />
                  <Text style={[styles.recommendationText, { color: themeColors.textSecondary }]}>
                    {rec}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <Card style={styles.sectionCard} accessibilityLabel="Weekly lesson activity chart">
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Daily Lesson Completions
          </Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={screenWidth - spacing.lg * 4}
              height={180}
              animated
              loading={activityLoading}
              showValues
            />
          </View>
        </Card>

        <Button
          title="Export Report"
          variant="outline"
          fullWidth
          onPress={handleExport}
          style={styles.exportButton}
          accessibilityLabel="Export full report"
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.md,
  },
  weekRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  weekRangeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 72,
    marginBottom: spacing.sm,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  skillsImprovedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skillsImprovedContent: {
    flex: 1,
  },
  skillsImprovedValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  skillsImprovedLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  weakSkillsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  weakSkillsTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
  },
  weakSkillRow: {
    marginBottom: spacing.md,
  },
  weakSkillTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  weakSkillName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    flex: 1,
    marginRight: spacing.sm,
  },
  weakSkillScore: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  recommendationsList: {
    gap: spacing.md,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  recommendationText: {
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  exportButton: {
    marginTop: spacing.sm,
  },
});
