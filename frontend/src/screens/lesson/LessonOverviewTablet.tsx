import React from 'react';
import { StyleSheet, View, ScrollView, Text, ActivityIndicator, Pressable, Alert } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card, SectionHeader, Button } from '../../components/ui';
import { ActivityCard } from '../../components/cards/ActivityCard';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { spacing, colors, typography, radius, shadows } from '../../theme';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { useNavigation } from '@react-navigation/native';
import { useRoadmapStore } from '../../store/roadmapStore';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/client';
import { navigateToActivity } from '../../utils/navigationFlow';

export const LessonOverviewTablet: React.FC = () => {
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
            <Text style={[styles.errorText, { fontFamily: typography.families.rounded }]}>{error}</Text>
          </View>
        ) : !selectedLesson ? (
          <View style={styles.center}>
            <Text style={[styles.emptyText, { fontFamily: typography.families.rounded }]}>No lesson selected.</Text>
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
                <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                <Text style={[styles.backText, { fontFamily: typography.families.rounded }]}>Back to Journey</Text>
              </Pressable>
              
              <SectionHeader
                title={selectedLesson.title}
                subtitle={selectedLesson.description || 'Trace your shapes and complete the activities!'}
              />
            </View>

            <View style={styles.content}>
              <Text style={[styles.sectionTitle, { fontFamily: typography.families.rounded }]}>Activities Sequence</Text>
              
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
            </View>
          </ScrollView>
        )}

        {/* Right column: Action Panel */}
        <View style={styles.sidebar}>
          <Text style={[styles.sidebarTitle, { fontFamily: typography.families.rounded }]}>Lesson Status</Text>

          <Card style={styles.statusBox}>
            <Text style={[styles.statusLabel, { fontFamily: typography.families.rounded }]}>STATUS</Text>
            {isCompleted ? (
              <View style={styles.statusSuccess}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={[styles.statusSuccessText, { fontFamily: typography.families.rounded }]}>Completed</Text>
              </View>
            ) : (
              <View style={styles.statusPending}>
                <Ionicons name="ellipse-outline" size={18} color={colors.yellow} />
                <Text style={[styles.statusPendingText, { fontFamily: typography.families.rounded }]}>In Progress</Text>
              </View>
            )}

            <Button
              label={isCompleted ? 'Re-complete' : 'Complete Lesson'}
              variant={isCompleted ? 'success' : 'primary'}
              onPress={handleCompleteLesson}
              style={styles.completeBtn}
            />
          </Card>

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
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1.2,
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
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.xs,
  },
  card: {
    marginBottom: spacing.sm,
  },
  sidebar: {
    width: 280,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sidebarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
  },
  statusBox: {
    padding: spacing.md,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.0,
    marginBottom: spacing.xs,
  },
  statusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
  },
  statusPendingText: {
    color: colors.yellow,
    fontWeight: typography.weights.bold,
    fontSize: 16,
  },
  completeBtn: {
    width: '100%',
    height: 48,
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
    color: colors.coral,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
export default LessonOverviewTablet;
