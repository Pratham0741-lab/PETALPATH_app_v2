import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  useMonthlyReport,
  useAnalyticsActivity,
} from '../../hooks/useParentAnalytics';
import { CurriculumProgressCard } from '../../components/analytics/CurriculumProgressCard';
import { ConsistencyCard } from '../../components/analytics/ConsistencyCard';
import { ProgressRing } from '../../components/charts/ProgressRing';
import { BarChart } from '../../components/charts/BarChart';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius, breakpoints } from '../../theme';
import type { MonthlyReport } from '../../services/api/analyticsApi';

export const MonthlyReportScreen: React.FC = () => {
  const { theme: { colors: themeColors } } = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const { width: screenWidth } = useWindowDimensions();
  const isTabletOrDesktop = screenWidth >= breakpoints.mobileMax;

  const report = useMonthlyReport();
  const activity = useAnalyticsActivity('monthly');

  const [refreshing, setRefreshing] = useState(false);

  const reportData: MonthlyReport | undefined = report.data?.data;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      report.refetch(),
      activity.refetch(),
    ]);
  }, [report, activity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const barChartData = useMemo(
    () =>
      activity.data?.data?.buckets.map((b) => ({
        label: b.label,
        value: b.total,
      })) ?? [],
    [activity.data],
  );

  const handleExport = useCallback(() => {
    Alert.alert('Export', 'Export functionality coming soon.');
  }, []);

  const isLoading = report.isLoading || activity.isLoading;
  const hasError = report.error || activity.error;
  const isEmpty = !isLoading && !hasError && !reportData;

  if (report.isLoading && activity.isLoading) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            isTabletOrDesktop && styles.scrollContainerTablet,
          ]}
        >
          <View style={styles.header}>
            <Skeleton width={40} height={40} variant="circle" />
            <Skeleton width={200} height={28} style={{ marginLeft: spacing.sm }} />
            <Skeleton width={80} height={36} style={{ marginLeft: 'auto' }} borderRadius={radius.button} />
          </View>
          <Skeleton variant="card" style={{ marginBottom: spacing.xl }} />
          <Skeleton variant="card" style={{ marginBottom: spacing.xl }} />
          <Skeleton variant="card" style={{ marginBottom: spacing.xl }} />
          <Skeleton variant="card" style={{ marginBottom: spacing.xl }} />
          <Skeleton variant="card" style={{ marginBottom: spacing.xl }} />
          <Skeleton variant="card" style={{ marginBottom: spacing.xl }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (hasError && !reportData) {
    const err = report.error ?? activity.error;
    return (
      <ScreenContainer>
        <ErrorState
          title="Could not load monthly report"
          message={err instanceof Error ? err.message : 'An unexpected error occurred.'}
          onRetry={() => handleRetry(report, activity)}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isTabletOrDesktop && styles.scrollContainerTablet,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
        }
      >
        <View style={styles.header} accessibilityRole="header">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Ionicons name="calendar" size={28} color={themeColors.primary} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Monthly Report</Text>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: themeColors.primary }]}
            onPress={handleExport}
            accessibilityRole="button"
            accessibilityLabel="Export report"
          >
            <Ionicons name="download-outline" size={18} color={themeColors.textInverse} />
            <Text style={[styles.exportLabel, { color: themeColors.textInverse }]}>Export</Text>
          </TouchableOpacity>
        </View>

        {isEmpty ? (
          <EmptyState title="No report yet" message="Complete lessons this month to see your report." />
        ) : reportData ? (
          <>
            <Card style={styles.section} accessibilityLabel="Report month">
              <View style={styles.monthRow}>
                <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
                <Text style={[styles.monthLabel, { color: themeColors.text }]}>{reportData.month}</Text>
              </View>
            </Card>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: themeColors.surfaceSecondary }]}>
                <Text style={[styles.statValue, { color: themeColors.primary }]}>
                  {reportData.totalLearningMinutes}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Minutes</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: themeColors.surfaceSecondary }]}>
                <Text style={[styles.statValue, { color: themeColors.secondary }]}>
                  {reportData.lessonsCompleted}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Lessons</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: themeColors.surfaceSecondary }]}>
                <Text style={[styles.statValue, { color: themeColors.success }]}>
                  {reportData.contentCompleted.modules}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Modules</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: themeColors.surfaceSecondary }]}>
                <Text style={[styles.statValue, { color: themeColors.accent }]}>
                  {reportData.contentCompleted.activities}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Activities</Text>
              </View>
            </View>

            <View style={styles.section}>
              <CurriculumProgressCard
                modulesCompleted={reportData.contentCompleted.modules}
                modulesTotal={Math.max(reportData.contentCompleted.modules, 1)}
                lessonsCompleted={reportData.lessonsCompleted}
                lessonsTotal={Math.max(reportData.lessonsCompleted, 1)}
                loading={report.isLoading}
                style={styles.curriculumCard}
              />
            </View>

            <View style={styles.masterySection}>
              <Card accessibilityLabel="Mastery growth" style={styles.masteryCard}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Mastery Growth</Text>
                <View style={styles.masteryRingWrap}>
                  <ProgressRing
                    progress={reportData.masteryGrowth}
                    size={140}
                    strokeWidth={12}
                    label="Growth"
                  />
                </View>
              </Card>
              <ConsistencyCard
                score={reportData.consistency}
                currentStreak={Math.round(reportData.consistency / 10)}
                longestStreak={Math.round(reportData.consistency / 8)}
                loading={report.isLoading}
                style={styles.consistencyCard}
              />
            </View>

            <Card style={styles.section} accessibilityLabel="Content completed breakdown">
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Content Completed</Text>
              <View style={styles.contentRow}>
                <View style={styles.contentItem}>
                  <Ionicons name="book" size={20} color={themeColors.secondary} />
                  <Text style={[styles.contentValue, { color: themeColors.text }]}>
                    {reportData.contentCompleted.lessons}
                  </Text>
                  <Text style={[styles.contentLabel, { color: themeColors.textSecondary }]}>Lessons</Text>
                </View>
                <View style={styles.contentItem}>
                  <Ionicons name="layers" size={20} color={themeColors.success} />
                  <Text style={[styles.contentValue, { color: themeColors.text }]}>
                    {reportData.contentCompleted.modules}
                  </Text>
                  <Text style={[styles.contentLabel, { color: themeColors.textSecondary }]}>Modules</Text>
                </View>
                <View style={styles.contentItem}>
                  <Ionicons name="bulb" size={20} color={themeColors.accent} />
                  <Text style={[styles.contentValue, { color: themeColors.text }]}>
                    {reportData.contentCompleted.activities}
                  </Text>
                  <Text style={[styles.contentLabel, { color: themeColors.textSecondary }]}>Activities</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.section} accessibilityLabel="Comparison with previous month">
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>vs Last Month</Text>
              <ComparisonRow
                icon="book"
                label="Lessons"
                value={reportData.previousMonthComparison.lessonsChange}
                themeColors={themeColors}
              />
              <ComparisonRow
                icon="time"
                label="Minutes"
                value={reportData.previousMonthComparison.minutesChange}
                themeColors={themeColors}
              />
              <ComparisonRow
                icon="trending-up"
                label="Mastery"
                value={reportData.previousMonthComparison.masteryChange}
                suffix="%"
                themeColors={themeColors}
              />
            </Card>

            <Card style={styles.section} accessibilityLabel="Achievements">
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Achievements</Text>
              {reportData.achievements.length > 0 ? (
                <View style={styles.achievementList}>
                  {reportData.achievements.map((ach, i) => (
                    <View key={`ach-${i}`} style={styles.achievementItem}>
                      <Ionicons name="trophy" size={18} color={themeColors.accent} />
                      <Text style={[styles.achievementText, { color: themeColors.text }]}>{ach}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState title="No achievements yet" message="Keep learning to earn achievements." />
              )}
            </Card>

            <Card style={styles.section} accessibilityLabel="Recommendations">
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recommendations</Text>
              {reportData.recommendations.length > 0 ? (
                <View style={styles.recommendationList}>
                  {reportData.recommendations.map((rec, i) => (
                    <View key={`rec-${i}`} style={styles.recommendationItem}>
                      <Ionicons name="bulb" size={18} color={themeColors.warning} />
                      <Text style={[styles.recommendationText, { color: themeColors.text }]}>{rec}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState title="No recommendations" message="Recommendations will appear based on learning patterns." />
              )}
            </Card>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Monthly Activity</Text>
              {activity.isLoading ? (
                <Skeleton variant="card" />
              ) : activity.error ? (
                <ErrorState
                  title="Could not load activity chart"
                  message={activity.error.message}
                  onRetry={() => activity.refetch()}
                />
              ) : barChartData.length > 0 ? (
                <Card style={styles.chartCard}>
                  <BarChart data={barChartData} width={screenWidth - spacing.lg * 4} height={220} animated showValues />
                </Card>
              ) : (
                <EmptyState title="No activity data" message="Activity chart will appear once lessons are logged." />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
};

interface ComparisonRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  suffix?: string;
  themeColors: Record<string, string>;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({ icon, label, value, suffix = '', themeColors }) => {
  const isPositive = value >= 0;
  const arrowIcon = isPositive ? 'arrow-up' : 'arrow-down';
  const arrowColor = isPositive ? themeColors.success : themeColors.error;
  const displayValue = `${isPositive ? '+' : ''}${value}${suffix}`;

  return (
    <View style={comparisonStyles.row} accessibilityLabel={`${label}: ${displayValue} compared to last month`}>
      <Ionicons name={icon} size={18} color={themeColors.textSecondary} />
      <Text style={[comparisonStyles.label, { color: themeColors.textSecondary }]}>{label}</Text>
      <Text style={[comparisonStyles.value, { color: arrowColor }]}>{displayValue}</Text>
      <Ionicons name={arrowIcon} size={16} color={arrowColor} />
    </View>
  );
};

const comparisonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  value: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});

function handleRetry(
  ...queries: Array<{ refetch: () => Promise<unknown> }>
): void {
  queries.forEach((q) => q.refetch());
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  scrollContainerTablet: {
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    gap: spacing.xs,
  },
  exportLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthLabel: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
  },
  curriculumCard: {
    marginBottom: 0,
  },
  masterySection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  masteryCard: {
    flex: 1,
    alignItems: 'center',
  },
  masteryRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  consistencyCard: {
    flex: 1,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  contentItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  contentValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  contentLabel: {
    fontSize: typography.sizes.xs,
  },
  achievementList: {
    gap: spacing.sm,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  achievementText: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  recommendationList: {
    gap: spacing.sm,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  recommendationText: {
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  chartCard: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
