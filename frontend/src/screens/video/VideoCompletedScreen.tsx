import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { AppCard } from '../../components/cards/AppCard';
import { AppButton } from '../../components/buttons/AppButton';
import { colors, typography, spacing, radius } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useVideoStore } from '../../store/videoStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { Ionicons } from '@expo/vector-icons';

const ACTIVITY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  video: 'videocam',
  listen: 'ear',
  speak: 'chatbubble-ellipses',
  write: 'create',
};

const ACTIVITY_LABELS: Record<string, string> = {
  video: 'Video',
  listen: 'Listen',
  speak: 'Speak',
  write: 'Write',
};

export const VideoCompletedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentVideo } = useVideoStore();
  const { selectedLesson, activities } = useRoadmapStore();

  const nextActivity = useMemo(() => {
    if (!currentVideo || !activities || activities.length === 0) return null;
    const currentIndex = activities.findIndex(
      (a) => a.activityType === 'video' && a.title === currentVideo.title,
    );
    if (currentIndex === -1 || currentIndex >= activities.length - 1) return null;
    return activities[currentIndex + 1];
  }, [currentVideo, activities]);

  const handleFinish = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('LessonOverview');
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        {/* Celebration Header */}
        <View style={styles.celebrationHeader}>
          <View style={styles.starCircle}>
            <Ionicons name="star" size={54} color={colors.yellow} />
          </View>
          <Text style={styles.title}>Amazing Job!</Text>
          <Text style={styles.subtitle}>
            You finished watching "{currentVideo?.title || 'Tutorial'}"
          </Text>
        </View>

        {/* Next Activity Card */}
        {nextActivity ? (
          <AppCard style={styles.nextCard}>
            <Text style={styles.nextLabel}>Next Activity</Text>
            <View style={styles.nextRow}>
              <View style={styles.activityIcon}>
                <Ionicons
                  name={ACTIVITY_ICONS[nextActivity.activityType] ?? 'bulb'}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{nextActivity.title}</Text>
                <Text style={styles.activityDesc}>
                  {ACTIVITY_LABELS[nextActivity.activityType] ?? 'Activity'} • Continue your lesson
                </Text>
              </View>
            </View>
          </AppCard>
        ) : null}

        {/* Back Button */}
        <AppButton
          label="Back to Lesson"
          onPress={handleFinish}
          style={styles.doneBtn}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  celebrationHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  starCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.yellow + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.yellow + '30',
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  nextCard: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  nextLabel: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  activityDesc: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
  doneBtn: {
    width: '100%',
    height: 54,
    borderRadius: radius.xl,
    marginTop: spacing.md,
  },
});

export default VideoCompletedScreen;
