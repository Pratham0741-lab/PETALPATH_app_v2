import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { AITutorCard } from '../../components/recommendations/AITutorCard';
import { WeakSkillCard } from '../../components/recommendations/WeakSkillCard';
import {
  useAITutorSessions,
  useCreateAITutorSession,
  useWeakSkills,
  useAdaptiveRecommendations,
} from '../../hooks/useIntelligence';
import { colors, spacing, typography, radius } from '../../theme';
import type { AITutorSession, WeakSkill } from '../../services/api/intelligenceApi';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatMessageCount(count: number): string {
  if (count === 0) return 'No messages';
  if (count === 1) return '1 message';
  return `${count} messages`;
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && onAction && (
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </Pressable>
    )}
  </View>
);

const ActiveSessionSkeleton: React.FC = () => (
  <Card style={styles.cardSection}>
    <Skeleton width={140} height={18} />
    <Skeleton width={100} height={14} style={{ marginTop: spacing.xs }} />
    <Skeleton width={80} height={14} style={{ marginTop: spacing.xs }} />
    <Skeleton width={130} height={40} style={{ marginTop: spacing.md }} />
  </Card>
);

const WeakSkillSkeleton: React.FC = () => (
  <Card style={styles.cardSection}>
    <Skeleton width={130} height={16} />
    <Skeleton width={90} height={12} style={{ marginTop: spacing.xs }} />
    <Skeleton width="100%" height={8} style={{ marginTop: spacing.sm }} />
    <Skeleton width={70} height={12} style={{ marginTop: spacing.xs }} />
    <Skeleton width={100} height={36} style={{ marginTop: spacing.md }} />
  </Card>
);

const RecommendationSkeleton: React.FC = () => (
  <Card style={styles.cardSection}>
    <Skeleton width="70%" height={16} />
    <Skeleton width="90%" height={12} style={{ marginTop: spacing.xs }} />
    <Skeleton width={60} height={12} style={{ marginTop: spacing.xs }} />
  </Card>
);

export const AITutorHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const [topic, setTopic] = useState('');

  const sessionsQuery = useAITutorSessions();
  const createSession = useCreateAITutorSession();
  const weakSkillsQuery = useWeakSkills();
  const recommendationsQuery = useAdaptiveRecommendations();

  const allSessions: AITutorSession[] = sessionsQuery.data?.data ?? [];
  const weakSkills: WeakSkill[] = weakSkillsQuery.data?.data ?? [];
  const recommendations = recommendationsQuery.data?.data ?? [];

  const activeSessions = useMemo(
    () => allSessions.filter((s) => s.status === 'active'),
    [allSessions],
  );

  const completedSessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.status === 'completed')
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
        .slice(0, 5),
    [allSessions],
  );

  const topRecommendations = useMemo(() => recommendations.slice(0, 3), [recommendations]);

  const handleResumeSession = useCallback(
    (sessionId: string) => {
      navigation.navigate('AITutorChat', { sessionId });
    },
    [navigation],
  );

  const handleStartNewSession = useCallback(() => {
    const trimmed = topic.trim();
    if (!trimmed) return;

    createSession.mutate(trimmed, {
      onSuccess: (response) => {
        const sessionId = response.data?.id;
        if (sessionId) {
          setTopic('');
          navigation.navigate('AITutorChat', { sessionId });
        }
      },
    });
  }, [topic, createSession, navigation]);

  /*
   * `MasteryScreen` is not a route name. Nothing in `RootNavigator` registers
   * it, so this press has always thrown "The action 'NAVIGATE' with payload
   * {"name":"MasteryScreen"} was not handled by any navigator" and the "View
   * All" link next to Weak Skills did nothing.
   *
   * `SkillMastery` is the registered name, and it is the surface that reads the
   * same `/mastery/child/:childId` projection these cards are built from — so
   * "View All" now lands on the full, grouped, searchable list of exactly what
   * this section is showing the top five of.
   */
  const handleViewAllWeakSkills = useCallback(() => {
    navigation.navigate('SkillMastery');
  }, [navigation]);

  const handleViewAllHistory = useCallback(() => {
    navigation.navigate('AITutorHistory');
  }, [navigation]);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="AI Tutor home screen"
      >
        <View style={[styles.header, isTablet && styles.headerTablet]}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="chatbubbles" size={40} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle} accessibilityRole="header">
            AI Tutor
          </Text>
          <Text style={styles.headerSubtitle}>
            Practice and improve with personalised tutoring
          </Text>
        </View>

        {sessionsQuery.isLoading && (
          <ActiveSessionSkeleton />
        )}

        {!sessionsQuery.isLoading && sessionsQuery.isError && null}

        {!sessionsQuery.isLoading && !sessionsQuery.isError && activeSessions.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Active Session" />
            {activeSessions.slice(0, 1).map((session) => (
              <Card key={session.id} style={styles.activeSessionCard}>
                <View style={styles.activeSessionRow}>
                  <View style={styles.activeSessionIcon}>
                    <View style={styles.activeDot} />
                  </View>
                  <View style={styles.activeSessionInfo}>
                    <Text style={styles.activeSessionTopic} numberOfLines={1}>
                      {session.topic}
                    </Text>
                    <View style={styles.activeSessionMeta}>
                      <Text style={styles.activeSessionStat}>
                        {formatMessageCount(session.messages.length)}
                      </Text>
                      <View style={styles.metaDivider} />
                      <Text style={styles.activeSessionStat}>
                        {formatDuration(session.duration)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Button
                  title="Resume Session"
                  onPress={() => handleResumeSession(session.id)}
                  variant="primary"
                  size="md"
                  leftIcon={<Ionicons name="play" size={18} color={colors.textInverse} />}
                  fullWidth
                  style={styles.resumeButton}
                  accessibilityLabel={`Resume session: ${session.topic}`}
                />
              </Card>
            ))}
          </View>
        )}

        {!sessionsQuery.isLoading && !sessionsQuery.isError && activeSessions.length === 0 && (
          <View style={styles.section}>
            <SectionHeader title="Start New Session" />
            <Card style={styles.newSessionCard}>
              <TextInput
                style={styles.topicInput}
                placeholder="Enter a topic to practice..."
                placeholderTextColor={colors.textMuted}
                value={topic}
                onChangeText={setTopic}
                returnKeyType="go"
                onSubmitEditing={handleStartNewSession}
                accessibilityLabel="Session topic input"
                accessibilityHint="Type a topic for the new AI tutor session"
              />
              <Button
                title="Start Session"
                onPress={handleStartNewSession}
                variant="primary"
                size="md"
                fullWidth
                loading={createSession.isPending}
                disabled={!topic.trim() || createSession.isPending}
                leftIcon={<Ionicons name="sparkles" size={18} color={colors.textInverse} />}
                style={styles.startButton}
                accessibilityLabel="Start new AI tutor session"
              />
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader
            title="Weak Skills"
            actionLabel="View All"
            onAction={handleViewAllWeakSkills}
          />
          {weakSkillsQuery.isLoading && (
            <>
              <WeakSkillSkeleton />
              <WeakSkillSkeleton />
            </>
          )}
          {!weakSkillsQuery.isLoading && weakSkillsQuery.isError && (
            <Card style={styles.cardSection}>
              <ErrorState
                title="Could not load weak skills"
                message="Failed to load weak skills data."
                onRetry={() => weakSkillsQuery.refetch()}
              />
            </Card>
          )}
          {!weakSkillsQuery.isLoading && !weakSkillsQuery.isError && weakSkills.length === 0 && (
            <Card style={styles.cardSection}>
              <EmptyState
                icon="🌟"
                title="Looking good!"
                message="No weak skills to practice right now."
              />
            </Card>
          )}
          {!weakSkillsQuery.isLoading && !weakSkillsQuery.isError && weakSkills.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weakSkillsScroll}
              accessibilityLabel="Weak skills list"
            >
              {weakSkills.slice(0, 5).map((skill) => (
                <View key={skill.skillId} style={styles.weakSkillCardWrap}>
                  <WeakSkillCard
                    skillName={skill.skillName}
                    domain={skill.domain}
                    masteryScore={skill.masteryScore}
                    gap={skill.gap}
                    priority={skill.priority}
                    style={styles.weakSkillCard}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recent Conversations" />
          {sessionsQuery.isLoading && (
            <>
              <Skeleton variant="card" height={100} style={{ marginBottom: spacing.md }} />
              <Skeleton variant="card" height={100} style={{ marginBottom: spacing.md }} />
            </>
          )}
          {!sessionsQuery.isLoading && sessionsQuery.isError && (
            <Card style={styles.cardSection}>
              <ErrorState
                title="Could not load conversations"
                message="Failed to load recent conversations."
                onRetry={() => sessionsQuery.refetch()}
              />
            </Card>
          )}
          {!sessionsQuery.isLoading && !sessionsQuery.isError && completedSessions.length === 0 && (
            <Card style={styles.cardSection}>
              <EmptyState
                icon="💬"
                title="No conversations yet"
                message="Complete an AI tutor session to see it here."
              />
            </Card>
          )}
          {!sessionsQuery.isLoading && !sessionsQuery.isError && completedSessions.length > 0 && (
            completedSessions.map((session) => (
              <AITutorCard
                key={session.id}
                title={session.topic}
                status="completed"
                messageCount={session.messages.length}
                onStart={() => handleResumeSession(session.id)}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recommended Help" />
          {recommendationsQuery.isLoading && (
            <>
              <RecommendationSkeleton />
              <RecommendationSkeleton />
            </>
          )}
          {!recommendationsQuery.isLoading && recommendationsQuery.isError && (
            <Card style={styles.cardSection}>
              <ErrorState
                title="Could not load recommendations"
                message="Failed to load recommendations."
                onRetry={() => recommendationsQuery.refetch()}
              />
            </Card>
          )}
          {!recommendationsQuery.isLoading && !recommendationsQuery.isError && topRecommendations.length === 0 && (
            <Card style={styles.cardSection}>
              <EmptyState
                icon="📚"
                title="No recommendations yet"
                message="Complete more activities to get personalised recommendations."
              />
            </Card>
          )}
          {!recommendationsQuery.isLoading && !recommendationsQuery.isError && topRecommendations.length > 0 && (
            topRecommendations.map((rec, index) => (
              <Card key={`rec-${index}`} style={styles.recommendationCard}>
                <View style={styles.recommendationRow}>
                  <View style={styles.recommendationIcon}>
                    <Ionicons
                      name={
                        rec.kind === 'ai_tutor'
                          ? 'chatbubbles'
                          : rec.kind === 'daily_challenge'
                          ? 'trophy'
                          : rec.kind === 'reinforcement'
                          ? 'refresh'
                          : 'bulb'
                      }
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle} numberOfLines={2}>
                      {rec.title}
                    </Text>
                    <Text style={styles.recommendationReason} numberOfLines={2}>
                      {rec.reason}
                    </Text>
                    <View style={styles.recommendationMeta}>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor:
                              rec.priority === 'high'
                                ? `${colors.error}20`
                                : rec.priority === 'medium'
                                ? `${colors.warning}20`
                                : `${colors.success}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            {
                              color:
                                rec.priority === 'high'
                                  ? colors.error
                                  : rec.priority === 'medium'
                                  ? colors.warning
                                  : colors.success,
                            },
                          ]}
                        >
                          {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Button
            title="View all sessions"
            onPress={handleViewAllHistory}
            variant="outline"
            size="md"
            fullWidth
            leftIcon={<Ionicons name="time-outline" size={18} color={colors.primary} />}
            accessibilityLabel="View all AI tutor sessions history"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  scrollContentTablet: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  headerTablet: {
    paddingTop: spacing.xl,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sectionAction: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  cardSection: {
    marginBottom: spacing.md,
  },
  activeSessionCard: {
    marginBottom: spacing.md,
  },
  activeSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeSessionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: `${colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  activeSessionInfo: {
    flex: 1,
  },
  activeSessionTopic: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  activeSessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSessionStat: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  resumeButton: {
    marginTop: spacing.xs,
  },
  newSessionCard: {
    marginBottom: spacing.md,
  },
  topicInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.body,
    color: colors.text,
    marginBottom: spacing.md,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  startButton: {
    marginTop: spacing.xs,
  },
  weakSkillsScroll: {
    paddingBottom: spacing.xs,
  },
  weakSkillCardWrap: {
    width: 220,
    marginRight: spacing.md,
  },
  weakSkillCard: {
    marginBottom: 0,
  },
  recommendationCard: {
    marginBottom: spacing.md,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  recommendationReason: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  priorityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
});
