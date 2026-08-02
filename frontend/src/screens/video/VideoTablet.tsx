import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Platform, DimensionValue } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useVideoStore } from '../../store/videoStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card, Button } from '../../components/ui';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

const VideoPlayerTablet: React.FC<{
  currentVideo: any;
  currentPosition: number;
  duration: number;
  isCompleted: boolean;
  savePosition: (position: number) => Promise<void>;
  completeVideo: () => Promise<void>;
  navigation: any;
  selectedLesson: any;
}> = ({
  currentVideo,
  currentPosition,
  duration,
  isCompleted,
  savePosition,
  completeVideo,
  navigation,
  selectedLesson,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

  // Initialize player
  const player = useVideoPlayer(currentVideo?.videoUrl || '', (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.currentTime = isCompleted ? 0 : currentPosition;
    p.play();
  });

  // Detect actual video dimensions to adjust aspect ratio
  useEffect(() => {
    const getDimensions = () => {
      if (player.availableVideoTracks && player.availableVideoTracks.length > 0) {
        const track = player.availableVideoTracks[0];
        if (track?.size?.width > 0 && track?.size?.height > 0) {
          setAspectRatio(track.size.width / track.size.height);
          return true;
        }
      }

      if (Platform.OS === 'web') {
        let videoEl = (player as any)._mountedVideos && [...(player as any)._mountedVideos][0];
        if (!videoEl) {
          videoEl = document.querySelector('video');
        }
        if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          setAspectRatio(videoEl.videoWidth / videoEl.videoHeight);
          return true;
        }
      }
      return false;
    };

    if (getDimensions()) return;

    const interval = setInterval(() => {
      if (getDimensions()) {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [player, currentVideo]);

  useEffect(() => {
    try {
      setIsPlaying(player.playing);
    } catch (e) {}
  }, [player.playing]);

  // Pause video when screen loses focus
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      try { player.pause(); } catch (_) {}
    }
  }, [isFocused, player]);

  // Poll for actual duration
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        if (player.duration > 0 && player.duration !== duration) {
          useVideoStore.setState({ duration: player.duration });
          clearInterval(interval);
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [player, duration]);

  // Event handlers
  useEventListener(player, 'timeUpdate', (event) => {
    try {
      const time = event.currentTime;
      savePosition(time);

      if (player.duration > 0 && player.duration !== duration) {
        useVideoStore.setState({ duration: player.duration });
      }

      if (duration > 0 && time >= 0.95 * duration && !videoEnded) {
        handleVideoCompletion();
      }
    } catch (e) {}
  });

  useEventListener(player, 'playToEnd', () => {
    handleVideoCompletion();
  });

  const handleVideoCompletion = async () => {
    try {
      player.pause();
    } catch (e) {}
    setVideoEnded(true);
  };

  const handleReplay = () => {
    try {
      player.currentTime = 0;
      player.play();
      setVideoEnded(false);
      setIsPlaying(true);
    } catch (e) {
      if (__DEV__) console.warn('Replay failed:', e);
    }
  };

  const handleNextPress = async () => {
    await completeVideo();
    const actId = currentVideo?.activityId || 'video';
    const next = getNextActivity(actId);
    if (next) {
      await navigateToActivity(navigation, next);
      return;
    }
    const { selectedLesson } = useRoadmapStore.getState();
    if (selectedLesson) {
      await useRoadmapStore.getState().completeLesson(selectedLesson.id);
      navigation.navigate('LessonComplete');
    } else {
      navigation.navigate('MainTabs', { screen: 'Journey' });
    }
  };

  const hasRealVideo = currentVideo?.videoUrl && currentVideo.videoUrl !== 'coming_soon' && !currentVideo.videoUrl.includes('coming_soon');

  return (
    <ScreenContainer style={styles.container}>
      {/* Top Bar with back navigation */}
      <View style={styles.topBar}>
        <Pressable style={styles.backIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          <Text style={[styles.topBarBackText, { fontFamily: typography.families.rounded }]}>Back to Lesson</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { fontFamily: typography.families.rounded }]} numberOfLines={1}>
          {selectedLesson?.title || 'Video Activity'}
        </Text>
        <Pressable style={styles.nextLinkBtn} onPress={handleNextPress}>
          <Text style={[styles.nextLinkText, { fontFamily: typography.families.rounded }]}>Next</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF8ED" />
        </Pressable>
      </View>

      {/* Main Content with Flexible Aspect Ratio */}
      <View style={styles.playerColumn}>
        <View style={[styles.flexibleVideoContainer, { aspectRatio }]}>
          {/* Always Visible Flexible Placeholder Card */}
          <View style={styles.placeholderCard}>
            <View style={styles.playCircle}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={42} color="#FFF8ED" style={{ marginLeft: isPlaying ? 0 : 4 }} />
            </View>
            <Text style={[styles.placeholderTitle, { fontFamily: typography.families.rounded }]} numberOfLines={1}>
              {currentVideo?.title || 'Video Lesson'}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.hdBadge}>
                <Ionicons name="film-outline" size={14} color={colors.yellow} />
                <Text style={[styles.hdBadgeText, { fontFamily: typography.families.rounded }]}>Demonstration Video</Text>
              </View>
            </View>
          </View>

          {/* Expo VideoView overlay */}
          {hasRealVideo && (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              nativeControls={!videoEnded}
            />
          )}

          {videoEnded && (
            <View style={[StyleSheet.absoluteFill, styles.endedOverlay]}>
              <Pressable style={styles.replayOverlayBtn} onPress={handleReplay}>
                <Ionicons name="refresh" size={24} color="#FFF8ED" />
                <Text style={[styles.replayOverlayBtnText, { fontFamily: typography.families.rounded }]}>Replay Video</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Bottom Area */}
      <View style={styles.bottomPanel}>
        {(videoEnded || isCompleted) ? (
          <Card style={styles.completedSection}>
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={32} color={colors.green} />
              <View style={styles.completedTextContainer}>
                <Text style={[styles.completedTitle, { fontFamily: typography.families.rounded }]}>Video Completed! 🎉</Text>
                <Text style={[styles.completedSubtitle, { fontFamily: typography.families.rounded }]}>You're ready to proceed to the next activity.</Text>
              </View>
            </View>
            <Button label="Next Activity ➔" variant="success" onPress={handleNextPress} style={styles.nextBtn} />
          </Card>
        ) : (
          <Card style={styles.infoCard}>
            <Text style={[styles.videoTitle, { fontFamily: typography.families.rounded }]}>{currentVideo?.title || 'Video Lesson'}</Text>
            <Text style={[styles.videoInstructions, { fontFamily: typography.families.rounded }]}>
              Watch the video demonstration carefully to prepare for the tracing activities.
            </Text>
            <Button label="Next Activity ➔" variant="primary" onPress={handleNextPress} style={styles.infoNextBtn} />
          </Card>
        )}
      </View>
    </ScreenContainer>
  );
};

const VideoComingSoonTablet: React.FC<{
  video: any;
  navigation: any;
  selectedLesson: any;
}> = ({ video, navigation, selectedLesson }) => {
  const { completeVideo } = useVideoStore();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleProceed = async () => {
    setIsCompleting(true);
    try {
      await completeVideo();
      const actId = video?.activityId || 'video';
      const next = getNextActivity(actId);
      if (next) {
        await navigateToActivity(navigation, next);
        return;
      }
      const { selectedLesson: activeLesson } = useRoadmapStore.getState();
      if (activeLesson) {
        await useRoadmapStore.getState().completeLesson(activeLesson.id);
        navigation.navigate('LessonComplete');
      } else {
        navigation.navigate('MainTabs', { screen: 'Journey' });
      }
    } catch (err) {
      if (__DEV__) console.warn('Failed to complete and proceed:', err);
      const { selectedLesson: activeLesson } = useRoadmapStore.getState();
      if (activeLesson) {
        navigation.navigate('LessonOverview', { lessonId: activeLesson.id });
      } else {
        navigation.navigate('MainTabs', { screen: 'Journey' });
      }
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with back navigation */}
      <View style={styles.topBar}>
        <Pressable style={styles.backIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <Text style={[styles.topBarBackText, { fontFamily: typography.families.rounded }]}>Back to Lesson</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { fontFamily: typography.families.rounded }]} numberOfLines={1}>
          {selectedLesson?.title || 'Video Activity'}
        </Text>
        <View style={{ width: 120 }} />
      </View>

      {/* Main Coming Soon Area */}
      <View style={styles.comingSoonPanel}>
        <Card style={styles.comingSoonCard}>
          <Ionicons name="film-outline" size={72} color={colors.yellow} style={styles.comingSoonIcon} />
          <Text style={[styles.comingSoonTitle, { fontFamily: typography.families.rounded }]}>Video Coming Soon! 🌟</Text>
          <Text style={[styles.comingSoonSubtitle, { fontFamily: typography.families.rounded }]}>
            Our team is preparing a magical video demonstration for this lesson.
          </Text>
          <Text style={[styles.comingSoonDetails, { fontFamily: typography.families.rounded }]}>
            You don't have to wait! Tap the button below to proceed to the learning activities.
          </Text>
        </Card>
      </View>

      {/* Bottom Area */}
      <View style={styles.bottomPanel}>
        <Button
          label="Proceed to Next Activity"
          variant="primary"
          onPress={handleProceed}
          disabled={isCompleting}
          style={styles.proceedBtn}
        />
      </View>
    </View>
  );
};

export const VideoTablet: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    currentVideo,
    currentPosition,
    duration,
    isCompleted,
    savePosition,
    completeVideo,
    loading,
    error,
  } = useVideoStore();

  const { selectedLesson } = useRoadmapStore();

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={styles.statusText}>Loading video...</Text>
      </View>
    );
  }

  if (error || !currentVideo) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle" size={48} color="#FF4A4A" />
        <Text style={styles.errorText}>{error || 'Video could not be loaded'}</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isComingSoon = currentVideo.filename === 'coming_soon' || currentVideo.videoUrl?.includes('coming_soon');

  if (isComingSoon) {
    return (
      <View style={{ flex: 1 }}>
        <VideoComingSoonTablet
          video={currentVideo}
          navigation={navigation}
          selectedLesson={selectedLesson}
        />
        <NavigationGuide
          screenKey="video"
          guideKey="video"
          message="Watch carefully!"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <VideoPlayerTablet
        currentVideo={currentVideo}
        currentPosition={currentPosition}
        duration={duration}
        isCompleted={isCompleted}
        savePosition={savePosition}
        completeVideo={completeVideo}
        navigation={navigation}
        selectedLesson={selectedLesson}
      />
      <NavigationGuide
        screenKey="video"
        guideKey="video"
        message="Watch carefully!"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  statusText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
  },
  errorText: {
    color: colors.textPrimary,
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backBtn: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
  },
  backBtnText: {
    color: '#FFF8ED',
    fontWeight: typography.weights.bold,
  },
  topBar: {
    height: 70,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
  },
  backIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  topBarBackText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  nextLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purple,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
  },
  nextLinkText: {
    color: '#FFF8ED',
    fontWeight: 'bold',
    fontSize: 13,
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
  playerColumn: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  flexibleVideoContainer: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#1E1B18',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  placeholderCard: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#2A2421',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  playCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  placeholderTitle: {
    color: '#FFF8ED',
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  hdBadgeText: {
    color: colors.yellow,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  replayOverlayBtn: {
    backgroundColor: 'rgba(59,52,47,0.85)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    ...shadows.md,
  },
  replayOverlayBtnText: {
    color: '#FFF8ED',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.small,
  },
  bottomPanel: {
    padding: spacing.xl,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  infoCard: {
    width: '100%',
    maxWidth: 680,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  videoTitle: {
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  videoInstructions: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  infoNextBtn: {
    width: '100%',
    height: 50,
  },
  completedSection: {
    width: '100%',
    maxWidth: 680,
    gap: spacing.md,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  completedTextContainer: {
    flex: 1,
  },
  completedTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  completedSubtitle: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
  },
  nextBtn: {
    width: '100%',
    height: 50,
  },
  endedOverlay: {
    backgroundColor: 'rgba(59,52,47,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonPanel: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  comingSoonCard: {
    alignItems: 'center',
    width: '85%',
    maxWidth: 500,
  },
  comingSoonIcon: {
    marginBottom: spacing.lg,
  },
  comingSoonTitle: {
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  comingSoonSubtitle: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  comingSoonDetails: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  proceedBtn: {
    width: '100%',
    maxWidth: 400,
    height: 50,
  },
});

export default VideoTablet;

