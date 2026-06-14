import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, ScrollView, Platform, DimensionValue } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useVideoStore } from '../../store/videoStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { VideoProgressBar } from '../../components/progress/VideoProgressBar';
import { Ionicons } from '@expo/vector-icons';

const VideoPlayerDesktop: React.FC<{
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

  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

  // Initialize player
  const player = useVideoPlayer(currentVideo?.videoUrl || '', (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.currentTime = isCompleted ? 0 : currentPosition;
    p.play();
  });

  // Track layout dimensions of parent panel
  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerDimensions({ width, height });
  };

  // Detect actual video dimensions to adjust aspect ratio
  useEffect(() => {
    const getDimensions = () => {
      // 1. Try availableVideoTracks (standard for native, fallback for web if populated)
      if (player.availableVideoTracks && player.availableVideoTracks.length > 0) {
        const track = player.availableVideoTracks[0];
        if (track?.size?.width > 0 && track?.size?.height > 0) {
          setAspectRatio(track.size.width / track.size.height);
          return true;
        }
      }

      // 2. On Web, read from the HTML5 video element mounted by expo-video or via DOM query
      if (Platform.OS === 'web') {
        let videoEl = (player as any)._mountedVideos && [...(player as any)._mountedVideos][0];
        if (!videoEl) {
          videoEl = document.querySelector('video');
        }
        if (videoEl) {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            setAspectRatio(videoEl.videoWidth / videoEl.videoHeight);
            return true;
          }
          // Attach listeners to detect when metadata is loaded or playback begins
          videoEl.onloadedmetadata = () => {
            if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
              setAspectRatio(videoEl.videoWidth / videoEl.videoHeight);
            }
          };
          videoEl.onplaying = () => {
            if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
              setAspectRatio(videoEl.videoWidth / videoEl.videoHeight);
            }
          };
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

  // Calculate proportional player dimensions
  const getPlayerDimensions = (): { 
    width: DimensionValue; 
    height: DimensionValue; 
    aspectRatio?: number; 
    maxWidth?: DimensionValue; 
    maxHeight?: DimensionValue;
  } => {
    if (Platform.OS === 'web') {
      return {
        width: '100%',
        height: '100%',
        aspectRatio,
        maxWidth: '100%',
        maxHeight: '100%',
      };
    }

    const { width: containerWidth, height: containerHeight } = containerDimensions;
    if (!containerWidth || !containerHeight) {
      return { width: '100%', height: '100%' };
    }

    const targetWidth = containerHeight * aspectRatio;
    if (targetWidth <= containerWidth) {
      return { width: targetWidth, height: containerHeight };
    } else {
      return { width: containerWidth, height: containerWidth / aspectRatio };
    }
  };

  const playerStyle = getPlayerDimensions();

  useEffect(() => {
    try {
      setIsPlaying(player.playing);
    } catch (e) {}
  }, [player.playing]);

  // Pause video when screen loses focus (navigating away) and resume when returning
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      try { player.pause(); } catch (_) {}
    }
  }, [isFocused, player]);

  // Poll for actual duration as soon as metadata is loaded
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        if (player.duration > 0) {
          if (player.duration !== duration) {
            useVideoStore.setState({ duration: player.duration });
          }
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
      console.warn('Replay failed:', e);
    }
  };

  const handleNextPress = async () => {
    await completeVideo();
    if (currentVideo) {
      const next = getNextActivity(currentVideo.activityId);
      if (next) {
        await navigateToActivity(navigation, next);
        return;
      }
    }
    navigation.navigate('LessonOverview');
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backLinkText}>Return to Lesson</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>{selectedLesson?.title || 'Video Activity'}</Text>
        <View style={{ width: 150 }} />
      </View>

      {/* Main Video Area */}
      <View style={styles.playerPanel} onLayout={handleLayout}>
        <View style={[styles.videoCard, playerStyle]}>
          <VideoView
            player={player}
            style={[StyleSheet.absoluteFill, Platform.OS === 'web' && { objectFit: 'contain' } as any]}
            contentFit="contain"
            nativeControls={!videoEnded}
          />
          {videoEnded && (
            <View style={[StyleSheet.absoluteFill, styles.endedOverlay]}>
              <Pressable style={styles.replayOverlayBtn} onPress={handleReplay}>
                <Ionicons name="refresh" size={32} color={colors.white} />
                <Text style={styles.replayOverlayBtnText}>Replay Video</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Bottom Area */}
      <View style={styles.bottomPanel}>
        {(videoEnded || isCompleted) ? (
          <View style={styles.completedSection}>
            <Ionicons name="checkmark-circle" size={32} color={colors.green} />
            <View style={styles.completedTextContainer}>
              <Text style={styles.completedTitle}>Video Completed!</Text>
              <Text style={styles.completedSubtitle}>You're ready to proceed to the next activity.</Text>
            </View>
            <Pressable style={styles.nextBtnBelow} onPress={handleNextPress}>
              <Text style={styles.nextBtnBelowText}>Next Activity</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <Text style={styles.videoTitle}>{currentVideo?.title || 'Video Lesson'}</Text>
            <Text style={styles.videoInstructions}>
              Watch the video demonstration carefully to prepare for the tracing activities.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const VideoComingSoonDesktop: React.FC<{
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
      const next = getNextActivity(video.activityId);
      if (next) {
        await navigateToActivity(navigation, next);
        return;
      }
      navigation.navigate('LessonOverview');
    } catch (err) {
      console.warn('Failed to complete and proceed:', err);
      navigation.navigate('LessonOverview');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backLinkText}>Return to Lesson</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>{selectedLesson?.title || 'Video Activity'}</Text>
        <View style={{ width: 150 }} />
      </View>

      {/* Main Coming Soon Area */}
      <View style={styles.comingSoonPanel}>
        <View style={styles.comingSoonCard}>
          <View style={styles.glowBg} />
          <Ionicons name="film-outline" size={112} color={colors.yellow} style={styles.comingSoonIcon} />
          <Text style={styles.comingSoonTitle}>Video Coming Soon! 🌟</Text>
          <Text style={styles.comingSoonSubtitle}>
            Our team is preparing a magical video demonstration for this lesson.
          </Text>
          <Text style={styles.comingSoonDetails}>
            You don't have to wait! Click the button below to proceed to the learning activities.
          </Text>
        </View>
      </View>

      {/* Bottom Area */}
      <View style={styles.bottomPanel}>
        <Pressable
          style={({ pressed }) => [
            styles.proceedBtn,
            pressed && styles.proceedBtnPressed,
            isCompleting && styles.proceedBtnDisabled,
          ]}
          onPress={handleProceed}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Text style={styles.proceedBtnText}>Proceed to Next Activity</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export const VideoDesktop: React.FC = () => {
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
      <VideoComingSoonDesktop
        video={currentVideo}
        navigation={navigation}
        selectedLesson={selectedLesson}
      />
    );
  }

  return (
    <VideoPlayerDesktop
      currentVideo={currentVideo}
      currentPosition={currentPosition}
      duration={duration}
      isCompleted={isCompleted}
      savePosition={savePosition}
      completeVideo={completeVideo}
      navigation={navigation}
      selectedLesson={selectedLesson}
    />
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
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.text,
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xl,
  },
  backBtn: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  backBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  topBar: {
    height: 70,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backLinkText: {
    color: colors.text,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  topBarTitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
  },
  playerPanel: {
    flex: 0.6,
    padding: spacing.md,
    backgroundColor: '#0a0a0c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...shadows.lg,
  },
  endedOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonPanel: {
    flex: 0.6,
    backgroundColor: '#050515',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  comingSoonCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '80%',
    maxWidth: 600,
    ...shadows.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBg: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.purple,
    opacity: 0.15,
  },
  comingSoonIcon: {
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  comingSoonTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  comingSoonSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 26,
  },
  comingSoonDetails: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  proceedBtn: {
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.md,
  },
  proceedBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  proceedBtnDisabled: {
    opacity: 0.5,
  },
  proceedBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  replayOverlayBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...shadows.lg,
  },
  replayOverlayBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  bottomPanel: {
    flex: 0.4,
    backgroundColor: colors.background,
    padding: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    alignItems: 'center',
    maxWidth: 600,
  },
  videoTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  videoInstructions: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  completedSection: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 600,
    width: '100%',
    ...shadows.md,
  },
  completedTextContainer: {
    flex: 1,
  },
  completedTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  completedSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  nextBtnBelow: {
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    ...shadows.md,
  },
  nextBtnBelowText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
});

export default VideoDesktop;
