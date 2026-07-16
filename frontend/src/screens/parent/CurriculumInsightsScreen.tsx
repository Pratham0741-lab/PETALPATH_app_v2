import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCurriculumInsights } from '../../hooks/useParentAnalytics';
import { ProgressRing } from '../../components/charts/ProgressRing';
import { CurriculumProgressCard } from '../../components/analytics/CurriculumProgressCard';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius, breakpoints } from '../../theme';
import type { CurriculumInsight } from '../../services/api/analyticsApi';

function healthConfig(health: CurriculumInsight['curriculumHealth']) {
  switch (health) {
    case 'good':
      return { label: 'Good', color: '#8DBB75', bg: '#E8F3E0', icon: 'checkmark-circle' as const };
    case 'needs_attention':
      return { label: 'Needs Attention', color: '#F2A15F', bg: '#FDF0E0', icon: 'alert-circle' as const };
    case 'behind':
      return { label: 'Behind', color: '#E57373', bg: '#FCE4E4', icon: 'warning' as const };
  }
}

export const CurriculumInsightsScreen: React.FC = () => {
  const navigation = useNavigation<{ goBack: () => void }>();
  const { width: screenWidth } = useWindowDimensions();
  const isTabletOrDesktop = screenWidth >= breakpoints.mobileMax;
  const { theme: { colors: themeColors } } = useTheme();

  const curriculum = useCurriculumInsights();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await curriculum.refetch();
    setRefreshing(false);
  }, [curriculum]);

  const data: CurriculumInsight | undefined = curriculum.data?.data;

  const modulesTotal = data
    ? data.modulesCompleted + data.modulesRemaining
    : 0;
  const lessonsTotal = data
    ? data.lessonsCompleted + data.lessonsRemaining
    : 0;

  if (curriculum.isLoading) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Skeleton variant="circle" width={40} height={40} />
            <Skeleton width={200} height={28} style={{ marginLeft: spacing.md }} />
          </View>
          <Skeleton variant="card" style={{ marginBottom: spacing.lg }} />
          <Skeleton variant="card" style={{ marginBottom: spacing.lg }} />
          <Skeleton variant="card" />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (curriculum.error) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Could not load curriculum insights"
          message={curriculum.error.message}
          onRetry={() => curriculum.refetch()}
        />
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={28} color={themeColors.text} />
          </TouchableOpacity>
          <Ionicons name="book" size={28} color={themeColors.primary} style={{ marginLeft: spacing.md }} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Curriculum Insights</Text>
        </View>
        <EmptyState
          icon="📚"
          title="No curriculum data"
          message="Curriculum insights will appear once your child starts a curriculum."
        />
      </ScreenContainer>
    );
  }

  const health = healthConfig(data.curriculumHealth);
  const modulesPercent = modulesTotal > 0 ? (data.modulesCompleted / modulesTotal) * 100 : 0;
  const lessonsPercent = lessonsTotal > 0 ? (data.lessonsCompleted / lessonsTotal) * 100 : 0;

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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={28} color={themeColors.text} />
          </TouchableOpacity>
          <Ionicons name="book" size={28} color={themeColors.primary} style={{ marginLeft: spacing.md }} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Curriculum Insights</Text>
        </View>

        <Card style={styles.section} accessibilityLabel="Current curriculum">
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Current Curriculum</Text>
          <View style={styles.curriculumRow}>
            <View style={styles.curriculumInfo}>
              <Text style={[styles.curriculumName, { color: themeColors.text }]}>
                {data.currentCurriculum}
              </Text>
              <Text style={[styles.curriculumSub, { color: themeColors.textSecondary }]}>
                {data.modulesCompleted + data.modulesRemaining} modules
              </Text>
            </View>
            <ProgressRing
              progress={data.roadmapCompletion}
              size={100}
              strokeWidth={8}
              label="Roadmap"
            />
          </View>
        </Card>

        <View style={styles.dualCardsRow}>
          <CurriculumProgressCard
            modulesCompleted={data.modulesCompleted}
            modulesTotal={modulesTotal}
            lessonsCompleted={data.lessonsCompleted}
            lessonsTotal={lessonsTotal}
            style={styles.halfCard}
          />
          <Card style={[styles.halfCard, styles.statCard]} accessibilityLabel="Average lesson completion">
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Avg Lesson</Text>
            <Text style={[styles.statValue, { color: themeColors.primary }]}>
              {data.averageLessonCompletion}%
            </Text>
            <Text style={[styles.statSublabel, { color: themeColors.textMuted }]}>Completion</Text>
          </Card>
        </View>

        <Card style={styles.section} accessibilityLabel="Progress summary">
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Progress Summary</Text>
          <View style={styles.progressBlock}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: themeColors.textSecondary }]}>Modules</Text>
              <Text style={[styles.progressCount, { color: themeColors.text }]}>
                {data.modulesCompleted}/{modulesTotal}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: themeColors.surfaceSecondary }]}>
              <View style={[styles.progressFill, { width: `${Math.min(modulesPercent, 100)}%`, backgroundColor: themeColors.secondary }]} />
            </View>
          </View>
          <View style={styles.progressBlock}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: themeColors.textSecondary }]}>Lessons</Text>
              <Text style={[styles.progressCount, { color: themeColors.text }]}>
                {data.lessonsCompleted}/{lessonsTotal}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: themeColors.surfaceSecondary }]}>
              <View style={[styles.progressFill, { width: `${Math.min(lessonsPercent, 100)}%`, backgroundColor: themeColors.primary }]} />
            </View>
          </View>
        </Card>

        <View style={styles.dualCardsRow}>
          <Card style={styles.halfCard} accessibilityLabel="Estimated completion">
            <Ionicons name="calendar-outline" size={24} color={themeColors.primary} />
            <Text style={[styles.estDays, { color: themeColors.text }]}>
              Estimated {data.estimatedCompletionDays} days remaining
            </Text>
          </Card>
          <Card style={styles.halfCard} accessibilityLabel={`Curriculum health: ${health.label}`}>
            <View style={[styles.healthBadge, { backgroundColor: health.bg }]}>
              <Ionicons name={health.icon} size={20} color={health.color} />
              <Text style={[styles.healthLabel, { color: health.color }]}>{health.label}</Text>
            </View>
            <Text style={[styles.statSublabel, { color: themeColors.textMuted, marginTop: spacing.sm }]}>
              Curriculum Health
            </Text>
          </Card>
        </View>

        <Card style={styles.section} accessibilityLabel="Next milestones">
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Next Milestones</Text>
          {data.nextMilestones.length === 0 ? (
            <EmptyState
              icon="🏁"
              title="No upcoming milestones"
              message="Complete more lessons to unlock milestones."
            />
          ) : (
            <View style={styles.milestonesList}>
              {data.nextMilestones.map((milestone, index) => (
                <View
                  key={`milestone-${index}`}
                  style={[
                    styles.milestoneRow,
                    index < data.nextMilestones.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: themeColors.divider,
                    },
                  ]}
                >
                  <View style={styles.milestoneLeft}>
                    <Ionicons
                      name={milestone.type === 'module' ? 'cube-outline' : 'folder-outline'}
                      size={20}
                      color={themeColors.primary}
                    />
                    <Text style={[styles.milestoneTitle, { color: themeColors.text }]}>
                      {milestone.title}
                    </Text>
                  </View>
                  <Text style={[styles.milestoneEta, { color: themeColors.textSecondary }]}>
                    ~{milestone.etaDays}d
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.section} accessibilityLabel="Roadmap completion">
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Roadmap Completion</Text>
          <View style={styles.roadmapCenter}>
            <ProgressRing
              progress={data.roadmapCompletion}
              size={140}
              strokeWidth={10}
              label="Complete"
            />
          </View>
          <View style={[styles.progressTrack, { backgroundColor: themeColors.surfaceSecondary, marginTop: spacing.lg }]}>
            <View style={[styles.progressFill, { width: `${Math.min(data.roadmapCompletion, 100)}%`, backgroundColor: themeColors.secondary }]} />
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
};

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
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginLeft: spacing.sm,
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  curriculumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  curriculumInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  curriculumName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  curriculumSub: {
    fontSize: typography.sizes.sm,
  },
  dualCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  halfCard: {
    flex: 1,
  },
  statCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },
  statSublabel: {
    fontSize: typography.sizes.caption,
    marginTop: spacing.xs,
  },
  progressBlock: {
    marginBottom: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  progressCount: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  estDays: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    gap: spacing.xs,
  },
  healthLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  milestonesList: {
    gap: 0,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  milestoneTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  milestoneEta: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.md,
  },
  roadmapCenter: {
    alignItems: 'center',
  },
});
