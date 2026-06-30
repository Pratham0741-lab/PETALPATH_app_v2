import React from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, Pressable, Alert } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { Card, SectionHeader, Button } from '../../components/ui';
import { ActivityCard } from '../../components/cards/ActivityCard';
import { spacing, colors, radius, typography, shadows } from '../../theme';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useRoadmapStore } from '../../store/roadmapStore';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { navigateToActivity } from '../../utils/navigationFlow';

export const LessonOverviewMobile: React.FC = () => {
  const { navigateToTab, navigation } = useAppNavigation();
  const {
    selectedLesson,
    activities,
    loading,
    error,
    completeLesson,
    completedLessons,
  } = useRoadmapStore();

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      useRoadmapStore.getState().loadRoadmap();
    });
    return unsubscribe;
  }, [navigation]);

  const isActivityUnlocked = (act: any, index: number) => {
    if (index === 0) return true;
    const prevAct = activities[index - 1];
    const progress = selectedLesson?.progress;
    if (!progress) return false;
    
    if (prevAct.activityType === 'video') return progress.videoCompleted;
    if (prevAct.activityType === 'listen') return progress.listenCompleted;
    if (prevAct.activityType === 'speak') return progress.speakCompleted;
    if (prevAct.activityType === 'write') return progress.writeCompleted;
    
    return false;
  };

  const handleActivityPress = async (act: any) => {
    console.log(`Activity selected: ${act.id}`);
    try {
      await api.get(`/activities/${act.id}`);
    } catch (err) {
      console.warn('Failed to log activity selection on backend:', err);
    }
    await navigateToActivity(navigation, act);
  };

  const handleCompleteLesson = () => {
    if (selectedLesson) {
      completeLesson(selectedLesson.id);
      Alert.alert(
        'Lesson Completed!',
        `Congratulations, you completed "${selectedLesson.title}"!`,
        [{ text: 'OK', onPress: () => navigateToTab('Journey') }]
      );
    }
  };

  const isCompleted = selectedLesson ? completedLessons.includes(selectedLesson.id) : false;

  return (
    <ScreenContainer>
      <TopBar
        title={selectedLesson?.title || 'Lesson Overview'}
        showBack={true}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading && activities.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.errorText, { fontFamily: typography.families.rounded }]}>{error}</Text>
          </View>
        ) : !selectedLesson ? (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { fontFamily: typography.families.rounded }]}>No lesson selected.</Text>
          </View>
        ) : (
          <View style={styles.content}>
            
            {/* Lesson Info Card */}
            <Card style={styles.lessonInfoCard}>
              <View style={styles.badgeRow}>
                <View style={styles.difficultyBadge}>
                  <Text style={[styles.difficultyText, { fontFamily: typography.families.rounded }]}>Level: {selectedLesson.difficulty}</Text>
                </View>
                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFF8ED" />
                    <Text style={[styles.completedText, { fontFamily: typography.families.rounded }]}>Done</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.lessonTitle, { fontFamily: typography.families.rounded }]}>{selectedLesson.title}</Text>
              <Text style={[styles.lessonDescription, { fontFamily: typography.families.rounded }]}>
                {selectedLesson.description || 'Practice your tracing skills in this interactive lesson!'}
              </Text>
            </Card>

            <SectionHeader
              title="Activities Sequence"
              subtitle="Work through each exercise from top to bottom."
            />

            {activities.length === 0 ? (
              <Text style={[styles.emptyText, { fontFamily: typography.families.rounded }]}>No activities found in this lesson.</Text>
            ) : (
              <View style={styles.list}>
                {activities.map((act, index) => (
                  <ActivityCard
                    key={act.id}
                    title={act.title}
                    duration={act.video?.duration ? `${Math.ceil(act.video.duration / 60)} mins` : '5 mins'}
                    type={act.activityType as any}
                    locked={!isActivityUnlocked(act, index)}
                    onPress={() => handleActivityPress(act)}
                    style={styles.card}
                  />
                ))}
              </View>
            )}

            {/* Complete Lesson CTA */}
            <Button
              label={isCompleted ? 'Re-complete Lesson' : 'Mark Lesson Complete'}
              variant={isCompleted ? 'success' : 'primary'}
              onPress={handleCompleteLesson}
              style={styles.completeBtn}
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  lessonInfoCard: {
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  difficultyBadge: {
    backgroundColor: '#E8F4FD',
    borderWidth: 1.5,
    borderColor: colors.blue,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.chip,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: '#6C9955',
  },
  difficultyText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: 'bold',
  },
  completedText: {
    color: '#FFF8ED',
    fontSize: 10,
    fontWeight: 'bold',
  },
  lessonTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    marginBottom: spacing.xs,
  },
  lessonDescription: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    lineHeight: 18,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.xs,
  },
  completeBtn: {
    width: '100%',
    height: 56,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  errorText: {
    color: colors.coral,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
export default LessonOverviewMobile;
