import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { IntelligenceWidgets } from '../../components/widgets/IntelligenceWidgets';
import { PersonalizationCard } from '../../components/recommendations/PersonalizationCard';
import { useAdaptiveProfile, useModalityPerformance } from '../../hooks/useIntelligence';

const MODALITY_CONFIG: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; colorKey: string }> = {
  visual: { icon: 'eye-outline', label: 'Visual', colorKey: 'purple' },
  auditory: { icon: 'ear-outline', label: 'Auditory', colorKey: 'blue' },
  kinesthetic: { icon: 'hand-left-outline', label: 'Kinesthetic', colorKey: 'coral' },
  reading: { icon: 'book-outline', label: 'Reading', colorKey: 'success' },
  mixed: { icon: 'options-outline', label: 'Mixed', colorKey: 'warning' },
};

const TREND_CONFIG: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; colorKey: string }> = {
  improving: { icon: 'arrow-up-circle', colorKey: 'success' },
  declining: { icon: 'arrow-down-circle', colorKey: 'error' },
  stable: { icon: 'remove-circle', colorKey: 'textMuted' },
};

function ProfileSummarySkeleton() {
  return (
    <Card>
      <View style={styles.summarySkeletonRow}>
        <Skeleton variant="circle" width={56} height={56} />
        <View style={styles.summarySkeletonText}>
          <Skeleton width={120} height={18} />
          <Skeleton width={80} height={14} style={{ marginTop: spacing.xs }} />
        </View>
      </View>
    </Card>
  );
}

function ModalityBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={styles.modalityRow} accessibilityLabel={`${label}: ${Math.round(score)}%`}>
      <Text style={styles.modalityLabel}>{label}</Text>
      <View style={styles.modalityBarTrack}>
        <View style={[styles.modalityBarFill, { width: `${Math.min(100, score)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.modalityScore, { color }]}>{Math.round(score)}%</Text>
    </View>
  );
}

export function AdaptiveProfileScreen() {
  const { theme: { colors: themeColors }, isDark } = useTheme();
  const { data: profileResp, isLoading: profileLoading, isError: profileError, error: profileErr, refetch: refetchProfile, isFetching: profileFetching } = useAdaptiveProfile();
  const { data: modalityData, isLoading: modalityLoading, isError: modalityError, refetch: refetchModality } = useModalityPerformance();

  const profile = profileResp?.data ?? null;

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchProfile(), refetchModality()]);
  }, [refetchProfile, refetchModality]);

  const isLoading = profileLoading || modalityLoading;
  const isError = profileError || modalityError;
  const isFetching = profileFetching;

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
          accessibilityLabel="Loading adaptive profile"
        >
          <View style={styles.header}>
            <Skeleton variant="circle" width={36} height={36} />
            <Skeleton width={160} height={24} style={{ marginLeft: spacing.sm }} />
          </View>
          <ProfileSummarySkeleton />
          <IntelligenceWidgets profile={null} loading />
          <Card>
            <Skeleton width={140} height={18} />
            <View style={{ marginTop: spacing.md }}>
              {[1, 2, 3, 4].map((i: number) => (
                <Skeleton key={i} width="100%" height={24} style={{ marginTop: spacing.sm }} />
              ))}
            </View>
          </Card>
          <Card>
            <Skeleton width={160} height={18} />
            <View style={{ marginTop: spacing.md }}>
              {[1, 2, 3].map((i: number) => (
                <Skeleton key={i} variant="card" height={64} style={{ marginTop: spacing.sm }} />
              ))}
            </View>
          </Card>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <ErrorState
            title="Couldn't load learning profile"
            message={(profileErr as { message?: string })?.message ?? 'An error occurred loading profile data.'}
            onRetry={onRefresh}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (!profile) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}>
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={56} color={themeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: themeColors.textSecondary }]}>
              No profile data yet
            </Text>
            <Text style={[styles.emptyMessage, { color: themeColors.textMuted }]}>
              Complete some learning activities to build your profile.
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  const modalityConfig = MODALITY_CONFIG[profile.preferredModality] ?? MODALITY_CONFIG.mixed;
  const trendConfig = TREND_CONFIG[profile.trend] ?? TREND_CONFIG.stable;
  const trendColor = themeColors[trendConfig.colorKey] ?? themeColors.textMuted;
  const modalityColor = themeColors[modalityConfig.colorKey] ?? themeColors.purple;

  const personalizationFactors = profile.personalizationFactors ?? [];

  const modalityEntries = useMemo<Array<[string, number]>>(() => {
    if (modalityData?.data && typeof modalityData.data === 'object') {
      return Object.entries(modalityData.data as Record<string, number>);
    }
    return [];
  }, [modalityData]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: themeColors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        accessibilityLabel="Learning Profile Screen"
      >
        <View style={styles.header}>
          <View style={[styles.headerIconWrap, { backgroundColor: `${themeColors.primary}18` }]}>
            <Ionicons name="compass-outline" size={24} color={themeColors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Learning Profile</Text>
        </View>

        <Card accessibilityLabel="Profile summary">
          <View style={styles.summaryRow}>
            <View style={styles.speedometerSection}>
              <View style={[styles.speedometerCircle, { borderColor: themeColors.secondary }]}>
                <Text style={[styles.speedometerValue, { color: themeColors.secondary }]}>
                  {Math.round(profile.learningSpeed)}%
                </Text>
                <Text style={[styles.speedometerLabel, { color: themeColors.textMuted }]}>Speed</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryInfo}>
              <View style={styles.summaryRowItem}>
                <View style={[styles.modalityIconWrap, { backgroundColor: `${modalityColor}18` }]}>
                  <Ionicons name={modalityConfig.icon} size={20} color={modalityColor} />
                </View>
                <View style={styles.summaryRowText}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>Modality</Text>
                  <Text style={[styles.summaryValue, { color: themeColors.text }]}>{modalityConfig.label}</Text>
                </View>
              </View>
              <View style={styles.summaryRowItem}>
                <View style={[styles.trendIconWrap, { backgroundColor: `${trendColor}18` }]}>
                  <Ionicons name={trendConfig.icon} size={20} color={trendColor} />
                </View>
                <View style={styles.summaryRowText}>
                  <Text style={[styles.summaryLabel, { color: themeColors.textMuted }]}>Trend</Text>
                  <Text style={[styles.summaryValue, { color: trendColor, textTransform: 'capitalize' }]}>
                    {profile.trend}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Intelligence Metrics</Text>
        <IntelligenceWidgets profile={profile} />

        {modalityEntries.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Modality Performance</Text>
            <Card accessibilityLabel="Modality performance breakdown">
              {modalityEntries.map(([key, val]) => (
                <ModalityBar
                  key={key}
                  label={MODALITY_CONFIG[key]?.label ?? key}
                  score={val}
                  color={themeColors[MODALITY_CONFIG[key]?.colorKey as keyof typeof themeColors] ?? themeColors.purple}
                />
              ))}
            </Card>
          </>
        )}

        {personalizationFactors.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Personalization Factors</Text>
            <View
              style={styles.personalizationGrid}
              accessibilityLabel="Personalization factors"
              accessibilityRole="list"
            >
              {personalizationFactors.map((factor: { factor: string; value: number }, index: number) => (
                <PersonalizationCard
                  key={factor.factor ?? index}
                  factor={factor.factor}
                  value={factor.value}
                  style={styles.personalizationCard}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  summarySkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summarySkeletonText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedometerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: spacing.lg,
  },
  speedometerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedometerValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  speedometerLabel: {
    fontSize: typography.sizes.xs,
    marginTop: -2,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    marginHorizontal: spacing.md,
  },
  summaryInfo: {
    flex: 1,
    gap: spacing.md,
  },
  summaryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRowText: {
    marginLeft: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
  },
  summaryValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  modalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalityLabel: {
    width: 80,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  modalityBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.progress,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  modalityBarFill: {
    height: '100%',
    borderRadius: radius.progress,
  },
  modalityScore: {
    width: 44,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    textAlign: 'right',
  },
  personalizationGrid: {
    gap: spacing.sm,
  },
  personalizationCard: {
    marginBottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  emptyMessage: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
