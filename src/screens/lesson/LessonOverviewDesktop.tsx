import React from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator, Pressable, Alert } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ActivityCard } from '../../components/cards/ActivityCard';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { spacing, colors, typography, radius, shadows } from '../../theme';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';
import { useVideoStore } from '../../store/videoStore';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { navigateToActivity } from '../../utils/navigationFlow';

export const LessonOverviewDesktop: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;
  const {
    selectedLesson,
    activities,
    loading,
    error,
    completeLesson,
    completedLessons,
  } = useRoadmapStore();

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
        [{ text: 'OK', onPress: () => navigation.navigate('Journey') }]
      );
    }
  };

  const isCompleted = selectedLesson ? completedLessons.includes(selectedLesson.id) : false;

  return (
    <ScreenContainer>
      <View style={styles.layout}>
        {/* Left column: Activities list */}
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
          <ScrollView
            style={styles.mainContent}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              {/* Custom Back Button */}
              <Pressable
                onPress={() => navigation.navigate('Journey')}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
                <Text style={styles.backText}>Back to Journey</Text>
              </Pressable>

              <SectionHeader
                title={selectedLesson.title}
                subtitle={selectedLesson.description || 'Trace your shapes and complete the activities!'}
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.sectionTitle}>Activities Sequence</Text>

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
            </View>
          </ScrollView>
        )}

        {/* Right column: Action Panel */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Lesson Actions</Text>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>STATUS</Text>
            {isCompleted ? (
              <View style={styles.statusSuccess}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={styles.statusSuccessText}>Completed</Text>
              </View>
            ) : (
              <View style={styles.statusPending}>
                <Ionicons name="ellipse-outline" size={18} color={colors.yellow} />
                <Text style={styles.statusPendingText}>In Progress</Text>
              </View>
            )}

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
                size={18}
                color={colors.white}
              />
              <Text style={styles.completeButtonText}>
                {isCompleted ? 'Re-complete' : 'Complete Lesson'}
              </Text>
            </Pressable>
          </View>

          <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  scrollContainer: {
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  backText: {
    color: colors.text,
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.xs,
  },
  card: {
    marginBottom: spacing.sm,
  },
  sidebar: {
    width: 320,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  statusBox: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.0,
    marginBottom: spacing.xs,
  },
  statusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  statusSuccessText: {
    color: colors.green,
    fontWeight: typography.weights.bold,
    fontSize: 16,
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  statusPendingText: {
    color: colors.yellow,
    fontWeight: typography.weights.bold,
    fontSize: 16,
  },
  completeButton: {
    flexDirection: 'row',
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
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
    fontSize: typography.sizes.sm,
    marginLeft: spacing.sm,
  },
  mentorCard: {
    marginTop: spacing.xs,
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
  },
});
