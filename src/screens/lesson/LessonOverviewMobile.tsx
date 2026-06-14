import React, { useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, ActivityIndicator, Pressable, Alert } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ActivityCard } from '../../components/cards/ActivityCard';
import { spacing, colors, radius, typography, shadows } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useVideoStore } from '../../store/videoStore';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { navigateToActivity } from '../../utils/navigationFlow';

export const LessonOverviewMobile: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    selectedLesson,
    activities,
    loading,
    error,
    completeLesson,
    completedLessons,
  } = useRoadmapStore();

  const handleActivityPress = async (act: any) => {
    // 1. Log activity selection to console
    console.log(`Activity selected: ${act.id}`);
    
    // 2. Log activity selection to backend endpoint
    try {
      await api.get(`/activities/${act.id}`);
    } catch (err) {
      console.warn('Failed to log activity selection on backend:', err);
    }

    // 3. Navigate to the activity using navigation flow helper
    await navigateToActivity(navigation, act);
  };

  const handleCompleteLesson = () => {
    if (selectedLesson) {
      completeLesson(selectedLesson.id);
      Alert.alert(
        'Lesson Completed!',
        `Congratulations, you completed "${selectedLesson.title}"!`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Journey' }) }]
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
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : !selectedLesson ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No lesson selected.</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Lesson Info Card */}
            <View style={styles.lessonInfoCard}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, styles.difficultyBadge]}>
                  <Text style={styles.difficultyText}>{selectedLesson.difficulty}</Text>
                </View>
                {isCompleted && (
                  <View style={[styles.badge, styles.completedBadge]}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.white} />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>
              <Text style={styles.lessonTitle}>{selectedLesson.title}</Text>
              <Text style={styles.lessonDescription}>
                {selectedLesson.description || 'Practice your tracing skills in this interactive lesson!'}
              </Text>
            </View>

            <SectionHeader
              title="Activities Sequence"
              subtitle="Work through each exercise from top to bottom."
            />

            {activities.length === 0 ? (
              <Text style={styles.emptyText}>No activities found in this lesson.</Text>
            ) : (
              <View style={styles.list}>
                {activities.map((act) => (
                  <ActivityCard
                    key={act.id}
                    title={act.title}
                    duration={act.video?.duration ? `${Math.ceil(act.video.duration / 60)} mins` : '5 mins'}
                    type={act.activityType as any}
                    onPress={() => handleActivityPress(act)}
                    style={styles.card}
                  />
                ))}
              </View>
            )}

            {/* Complete Lesson CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.completeButton,
                isCompleted && styles.completeButtonDone,
                pressed && styles.completeButtonPressed,
              ]}
              onPress={handleCompleteLesson}
            >
              <Ionicons
                name={isCompleted ? 'checkmark-circle-outline' : 'star'}
                size={22}
                color={colors.white}
              />
              <Text style={styles.completeButtonText}>
                {isCompleted ? 'Re-complete Lesson' : 'Mark Lesson Complete'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  lessonInfoCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  difficultyBadge: {
    backgroundColor: '#3B82F625',
    borderWidth: 1,
    borderColor: colors.blue,
  },
  completedBadge: {
    backgroundColor: colors.green,
  },
  difficultyText: {
    color: colors.blue,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  completedText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  lessonTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    marginBottom: spacing.xs,
  },
  lessonDescription: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.xs,
  },
  completeButton: {
    flexDirection: 'row',
    backgroundColor: colors.purple,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  completeButtonDone: {
    backgroundColor: colors.green,
  },
  completeButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  completeButtonText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
    marginLeft: spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  errorText: {
    color: '#FF4A4A',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
