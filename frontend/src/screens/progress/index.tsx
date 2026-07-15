import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { Card, Button, ProgressBar, EmotionCard } from '../../components/ui';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useProgressStore } from '../../store/progressStore';
import { Ionicons } from '@expo/vector-icons';
import {
  useAnalyticsProgress,
  useAnalyticsRewards,
  useAnalyticsActivity,
  useAnalyticsTimeline,
  useAnalyticsSubjects,
} from '../../hooks/useAnalytics';
import { useChildStore } from '../../store/childStore';
import { toUserMessage } from '../../api/errors';

type TabType = 'overview' | 'skills' | 'activity' | 'emotions';

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const timelineIcon: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  LESSON_COMPLETED: 'school',
  ASSESSMENT_COMPLETED: 'clipboard',
  REWARD_EARNED: 'star',
  VIDEO_WATCHED: 'videocam',
};

export const ProgressScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [activityPeriod, setActivityPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [timelinePage, setTimelinePage] = useState(1);

  const {
    completionPercentage,
    completedLessonsCount,
    totalLessonsCount,
    refreshProgress,
  } = useProgressStore();

  const activeChild = useChildStore((s) => s.activeChild);
  const { data: progressData, isLoading: progressLoading, isError: progressError, error: progressErr, refetch: refetchProgress } = useAnalyticsProgress();
  const { data: rewardsData, isLoading: rewardsLoading, isError: rewardsError, refetch: refetchRewards } = useAnalyticsRewards();
  const { data: activityData, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useAnalyticsActivity(activityPeriod);
  const { data: timelineData, isLoading: timelineLoading, isError: timelineError, refetch: refetchTimeline } = useAnalyticsTimeline(timelinePage);
  const { data: subjectsData, isLoading: subjectsLoading, isError: subjectsError, refetch: refetchSubjects } = useAnalyticsSubjects();

  useEffect(() => {
    refreshProgress();
  }, []);

  const progress = progressData?.data;
  const rewards = rewardsData?.data;
  const activity = activityData?.data;
  const timeline = timelineData?.data;
  const timelinePagination = timelineData?.pagination;
  const subjects = subjectsData?.data;

  const emotionsList = [
    { emoji: '😊', label: 'Happy', color: '#FFF3CD' },
    { emoji: '🤩', label: 'Excited', color: '#F8D7DA' },
    { emoji: '😌', label: 'Calm', color: '#D1E7DD' },
    { emoji: '😢', label: 'Sad', color: '#CFE2FF' },
    { emoji: '😡', label: 'Frustrated', color: '#F5C2C7' },
    { emoji: '😴', label: 'Tired', color: '#E2E3E5' },
  ];

  const tabs: TabType[] = ['overview', 'skills', 'activity', 'emotions'];

  const onRefreshTab = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        refreshProgress();
        refetchProgress();
        refetchRewards();
        break;
      case 'skills':
        refetchSubjects();
        break;
      case 'activity':
        refetchActivity();
        break;
    }
  }, [activeTab, refreshProgress, refetchProgress, refetchRewards, refetchSubjects, refetchActivity]);

  const renderSubjectSkills = () => {
    if (subjectsLoading) return <LoadingSpinner label="Loading skills…" />;
    if (subjectsError) return <ErrorState title="Couldn't load skills" message={toUserMessage(subjectsError)} onRetry={refetchSubjects} />;
    if (!subjects || subjects.length === 0) return <EmptyState icon="📊" title="No skills data yet" message="Complete some lessons to see skill progress." />;

    return subjects.map((subject: any, idx: number) => {
      const pct = Math.round(subject.progress ?? 0);
      const colorsList = [colors.blue, colors.purple, colors.green, colors.peach, colors.coral, colors.skyBlue];
      const barColor = colorsList[idx % colorsList.length];
      const emojis = ['📖', '🔢', '✏️', '🎨', '🧩', '🎵'];
      const emoji = emojis[idx % emojis.length];

      return (
        <View key={subject.subjectId ?? idx} style={styles.skillItem}>
          <View style={styles.skillHeader}>
            <View style={styles.skillLabelRow}>
              <Text style={styles.skillEmoji}>{emoji}</Text>
              <Text style={[styles.skillName, { fontFamily: typography.families.rounded }]}>
                {subject.subjectName ?? `Subject ${idx + 1}`}
              </Text>
            </View>
            <Text style={[styles.skillValue, { fontFamily: typography.families.rounded }]}>{pct}%</Text>
          </View>
          <ProgressBar progress={pct} color={barColor} />
        </View>
      );
    });
  };

  const renderActivityChart = () => {
    if (activityLoading) return <LoadingSpinner label="Loading activity…" />;
    if (activityError) return <ErrorState title="Couldn't load activity" message={toUserMessage(activityError)} onRetry={refetchActivity} />;
    if (!activity?.buckets || activity.buckets.length === 0) return <EmptyState icon="📅" title="No activity yet" message="Start learning to see your activity." />;

    const maxCount = Math.max(...activity.buckets.map((b: any) => b.total), 1);

    return (
      <View style={styles.activityChart}>
        {activity.buckets.map((bucket: any) => {
          const height = (bucket.total / maxCount) * 100;
          return (
            <View key={bucket.key} style={styles.bucketCol}>
              <Text style={styles.bucketValue}>{bucket.total}</Text>
              <View style={styles.barWrapper}>
                <View style={[styles.bar, { height: `${Math.max(height, 2)}%` as any }]} />
              </View>
              <Text style={styles.bucketLabel}>{bucket.label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTimeline = () => {
    if (timelineLoading) return <LoadingSpinner label="Loading timeline…" />;
    if (timelineError) return <ErrorState title="Couldn't load timeline" message={toUserMessage(timelineError)} onRetry={refetchTimeline} />;
    if (!timeline || timeline.length === 0) return <EmptyState icon="📜" title="No activity yet" message="Your learning timeline will appear here." />;

    return (
      <View style={styles.timelineContainer}>
        {timeline.map((item: any) => {
          const iconName = timelineIcon[item.type] ?? 'ellipse';
          return (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <Ionicons name={iconName} size={16} color={colors.purple} />
              </View>
              <View style={styles.timelineConnector} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, { fontFamily: typography.families.rounded }]}>
                  {item.title}
                </Text>
                <Text style={[styles.timelineTime, { fontFamily: typography.families.rounded }]}>
                  {formatTimestamp(item.timestamp)}
                </Text>
              </View>
            </View>
          );
        })}

        {timelinePagination && timelinePagination.totalPages > 1 && (
          <View style={styles.paginationRow}>
            <Button
              label="Previous"
              variant="secondary"
              disabled={timelinePage <= 1}
              onPress={() => setTimelinePage((p) => Math.max(1, p - 1))}
              style={styles.paginationBtn}
            />
            <Text style={[styles.pageInfo, { fontFamily: typography.families.rounded }]}>
              Page {timelinePagination.page} of {timelinePagination.totalPages}
            </Text>
            <Button
              label="Next"
              variant="secondary"
              disabled={timelinePage >= timelinePagination.totalPages}
              onPress={() => setTimelinePage((p) => p + 1)}
              style={styles.paginationBtn}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer>
      <TopBar title="My Progress" showBack />

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, { color: isActive ? '#FFF8ED' : colors.textSecondary, fontFamily: typography.families.rounded }]}>
                {tab.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <Card style={styles.overallProgressCard}>
              <Text style={[styles.overallTitle, { fontFamily: typography.families.rounded }]}>Overall Progress</Text>
              <View style={styles.seedlingRow}>
                <Text style={styles.seedlingEmoji}>🌱</Text>
                <View style={styles.seedlingText}>
                  <Text style={[styles.overallPercentText, { fontFamily: typography.families.rounded }]}>{completionPercentage}%</Text>
                  <Text style={[styles.completedRatio, { fontFamily: typography.families.rounded }]}>
                    {completedLessonsCount} of {totalLessonsCount} activities completed
                  </Text>
                </View>
              </View>
              <ProgressBar progress={completionPercentage} color={colors.green} style={styles.largeProgress} />
            </Card>

            {progressLoading ? (
              <LoadingSpinner label="Loading progress details…" />
            ) : progressError ? (
              <ErrorState title="Couldn't load progress" message={toUserMessage(progressErr)} onRetry={refetchProgress} />
            ) : progress ? (
              <>
                {progress.lessonTrend && progress.lessonTrend.length > 0 && (
                  <Card style={styles.breakdownCard}>
                    <Text style={[styles.breakdownTitle, { fontFamily: typography.families.rounded }]}>Lesson Trend</Text>
                    <View style={styles.trendRow}>
                      {progress.lessonTrend.slice(-7).map((point: any, i: number) => {
                        const maxCumulative = Math.max(...progress.lessonTrend.map((p: any) => p.cumulative), 1);
                        const barH = (point.cumulative / maxCumulative) * 100;
                        return (
                          <View key={i} style={styles.trendCol}>
                            <View style={styles.trendBarWrapper}>
                              <View style={[styles.trendBar, { height: `${Math.max(barH, 4)}%` as any }]} />
                            </View>
                            <Text style={styles.trendLabel}>
                              {new Date(point.date).getDate()}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </Card>
                )}

                <Card style={styles.breakdownCard}>
                  <Text style={[styles.breakdownTitle, { fontFamily: typography.families.rounded }]}>Modules & Categories</Text>
                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{progress.modules?.completed ?? 0}/{progress.modules?.total ?? 0}</Text>
                      <Text style={styles.statLabel}>Modules</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{progress.categories?.completed ?? 0}/{progress.categories?.total ?? 0}</Text>
                      <Text style={styles.statLabel}>Categories</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{progress.assessments?.completed ?? 0}</Text>
                      <Text style={styles.statLabel}>Assessments</Text>
                    </View>
                  </View>
                </Card>
              </>
            ) : null}

            {rewardsLoading ? (
              <LoadingSpinner label="Loading rewards…" />
            ) : rewardsError ? (
              <ErrorState title="Couldn't load rewards" message="Please try again later." onRetry={refetchRewards} />
            ) : rewards ? (
              <Card style={styles.breakdownCard}>
                <Text style={[styles.breakdownTitle, { fontFamily: typography.families.rounded }]}>Rewards & Achievements</Text>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>⭐ {rewards.stars ?? 0}</Text>
                    <Text style={styles.statLabel}>Stars</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{rewards.badges?.total ?? 0}</Text>
                    <Text style={styles.statLabel}>Badges</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{rewards.stickers?.total ?? 0}</Text>
                    <Text style={styles.statLabel}>Stickers</Text>
                  </View>
                </View>
                {rewards.recentRewards && rewards.recentRewards.length > 0 && (
                  <View style={styles.recentRow}>
                    {rewards.recentRewards.map((rw: any) => (
                      <View key={rw.id} style={styles.rewardChip}>
                        <Ionicons name="gift" size={14} color={colors.yellow} />
                        <Text style={styles.rewardChipText}>{rw.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            ) : null}

            <Card style={styles.breakdownCard}>
              <Text style={[styles.breakdownTitle, { fontFamily: typography.families.rounded }]}>Skills Level</Text>
              {renderSubjectSkills()}
            </Card>
          </View>
        )}

        {activeTab === 'skills' && (
          <View style={styles.tabContent}>
            <Pressable
              onPress={() => navigation.navigate('CurriculumExplorer' as never)}
              style={({ pressed }) => [
                styles.explorerLink,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="git-branch-outline" size={18} color={colors.purple} />
              <Text style={styles.explorerLinkText}>Explore Full Curriculum</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.purple} />
            </Pressable>

            {subjectsLoading ? (
              <LoadingSpinner label="Loading skills…" />
            ) : subjectsError ? (
              <ErrorState title="Couldn't load skills" message={toUserMessage(subjectsError)} onRetry={refetchSubjects} />
            ) : !subjects || subjects.length === 0 ? (
              <EmptyState icon="📊" title="No skills data yet" message="Complete some lessons to see skill progress." />
            ) : (
              <Card style={styles.detailedCard}>
                <Text style={[styles.detailedTitle, { fontFamily: typography.families.rounded }]}>My Subject Skills</Text>
                {subjects.map((subject: any, idx: number) => {
                  const accuracy = Math.round(subject.accuracy ?? 0);
                  const confidence = Math.round(subject.confidence ?? 0);
                  const retention = Math.round(subject.retention ?? 0);
                  const emojis = ['📖', '🔢', '✏️', '🎨', '🧩', '🎵'];
                  const emoji = emojis[idx % emojis.length];

                  return (
                    <View key={subject.subjectId ?? idx} style={styles.detailItem}>
                      <View style={styles.detailIconBg}>
                        <Text style={styles.detailIconEmoji}>{emoji}</Text>
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={[styles.detailName, { fontFamily: typography.families.rounded }]}>
                          {subject.subjectName ?? `Subject ${idx + 1}`}
                        </Text>
                        <View style={styles.detailMetrics}>
                          <View style={styles.detailMetric}>
                            <Text style={styles.detailMetricLabel}>Accuracy</Text>
                            <Text style={styles.detailMetricValue}>{accuracy}%</Text>
                          </View>
                          <View style={styles.detailMetric}>
                            <Text style={styles.detailMetricLabel}>Confidence</Text>
                            <Text style={styles.detailMetricValue}>{confidence}%</Text>
                          </View>
                          <View style={styles.detailMetric}>
                            <Text style={styles.detailMetricLabel}>Retention</Text>
                            <Text style={styles.detailMetricValue}>{retention}%</Text>
                          </View>
                        </View>
                        <ProgressBar progress={accuracy} color={colors.blue} style={styles.detailBar} />
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={styles.tabContent}>
            <View style={styles.periodRow}>
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <Pressable
                  key={period}
                  onPress={() => { setActivityPeriod(period); setTimelinePage(1); }}
                  style={[styles.periodChip, activityPeriod === period && styles.periodChipActive]}
                >
                  <Text style={[styles.periodLabel, activityPeriod === period && styles.periodLabelActive]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Card style={styles.activityCard}>
              <Text style={[styles.activityTitle, { fontFamily: typography.families.rounded }]}>
                {activityPeriod === 'daily' ? 'Today' : activityPeriod === 'weekly' ? 'This Week' : 'This Month'}
              </Text>
              {renderActivityChart()}
            </Card>

            <Card style={styles.activityCard}>
              <Text style={[styles.activityTitle, { fontFamily: typography.families.rounded }]}>Recent Activity</Text>
              {renderTimeline()}
            </Card>
          </View>
        )}

        {activeTab === 'emotions' && (
          <View style={styles.tabContent}>
            <Card style={styles.emotionSectionCard}>
              <Text style={[styles.emotionSectionTitle, { fontFamily: typography.families.rounded }]}>How are you feeling today?</Text>
              <Text style={[styles.emotionSectionSubtitle, { fontFamily: typography.families.rounded }]}>
                Select an emoji to share your feelings!
              </Text>
              <View style={styles.emotionGrid}>
                {emotionsList.map((emotion) => (
                  <EmotionCard
                    key={emotion.label}
                    emoji={emotion.emoji}
                    label={emotion.label}
                    color={emotion.color}
                    selected={selectedEmotion === emotion.label}
                    onPress={() => setSelectedEmotion(emotion.label)}
                    style={styles.emotionItemCard}
                  />
                ))}
              </View>
              {selectedEmotion && (
                <View style={[styles.emotionFeedback, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.emotionFeedbackText, { fontFamily: typography.families.rounded }]}>
                    It's wonderful to feel {selectedEmotion.toLowerCase()}! Let's do some cozy learning activities. 🌸
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        <Button label="Back to Journey" variant="secondary" onPress={() => navigation.goBack()} style={styles.backBtn} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    padding: spacing.xs,
  },
  tabItem: {
    flex: 1,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: colors.purple,
  },
  tabLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: 60,
    gap: spacing.md,
  },
  tabContent: {
    gap: spacing.md,
  },
  overallProgressCard: {
    gap: spacing.md,
  },
  overallTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  seedlingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  seedlingEmoji: {
    fontSize: 48,
  },
  seedlingText: {
    flex: 1,
  },
  overallPercentText: {
    fontSize: 34,
    fontWeight: typography.weights.black,
    color: colors.green,
  },
  completedRatio: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
  largeProgress: {
    height: 14,
    borderRadius: radius.xs,
  },
  breakdownCard: {
    gap: spacing.md,
  },
  breakdownTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: spacing.xs,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBarWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  trendBar: {
    width: '60%',
    backgroundColor: colors.purple,
    borderRadius: radius.xs,
    minHeight: 4,
  },
  trendLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rewardChipText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  skillItem: {
    gap: 6,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skillEmoji: {
    fontSize: 16,
  },
  skillName: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  skillValue: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  detailedCard: {
    gap: spacing.lg,
  },
  detailedTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  detailItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  detailIconBg: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#F8EEDC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  detailIconEmoji: {
    fontSize: 24,
  },
  detailContent: {
    flex: 1,
    gap: 4,
  },
  detailName: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  detailMetrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailMetricLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  detailMetricValue: {
    fontSize: 10,
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  detailBar: {
    height: 8,
    marginVertical: 2,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodChip: {
    flex: 1,
    height: 40,
    borderRadius: radius.chip,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  periodChipActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  periodLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  periodLabelActive: {
    color: '#FFF8ED',
  },
  activityCard: {
    gap: spacing.md,
  },
  activityTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  activityChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: spacing.xs,
  },
  bucketCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bucketValue: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    backgroundColor: colors.purple,
    borderRadius: radius.xs,
    minHeight: 2,
  },
  bucketLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  timelineContainer: {
    gap: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: `${colors.purple}15`,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineConnector: {
    position: 'absolute',
    left: 15,
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: colors.border,
  },
  timelineContent: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  timelineTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  timelineTime: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  paginationBtn: {
    minWidth: 100,
  },
  pageInfo: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  emotionSectionCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emotionSectionTitle: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emotionSectionSubtitle: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  emotionItemCard: {
    width: '28%',
    height: 100,
  },
  emotionFeedback: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    width: '100%',
  },
  emotionFeedbackText: {
    fontSize: typography.sizes.small,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  backBtn: {
    width: '100%',
    marginTop: spacing.md,
  },
  explorerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.purple}08`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.purple}20`,
  },
  explorerLinkText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.purple,
    fontFamily: typography.families.rounded,
  },
});
export default ProgressScreen;
