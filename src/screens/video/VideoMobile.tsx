import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Platform, DimensionValue } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useVideoStore } from '../../store/videoStore';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { Card, Button } from '../../components/ui';

const VideoPlayerMobile: React.FC<{
  currentVideo: any;
  currentPosition: number;
  duration: number;
  isCompleted: boolean;
  savePosition: (position: number) => Promise<void>;
  completeVideo: () => Promise<void>;
  navigation: any;
}> = ({
  currentVideo,
  currentPosition,
  duration,
  isCompleted,
  savePosition,
  completeVideo,
  navigation,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

  const videoViewRef = useRef<View>(null);

  // Initialize expo-video player
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
        if (videoEl) {
          if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            setAspectRatio(videoEl.videoWidth / videoEl.videoHeight);
            return true;
          }
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

  // Keep state synced with player changes
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

  // Listen to playback time update
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

  // Listen to playback finish
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
    <ScreenContainer style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <Text style={[styles.backLinkText, { fontFamily: typography.families.rounded }]}>Back</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { fontFamily: typography.families.rounded }]} numberOfLines={1}>
          {currentVideo.title}
        </Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Main Video Area */}
      <View style={styles.playerPanel} onLayout={handleLayout}>
        <View ref={videoViewRef} style={[styles.videoCard, playerStyle]}>
          <VideoView
            player={player}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }, Platform.OS === 'web' && { objectFit: 'contain' } as any]}
            contentFit="contain"
            nativeControls={!videoEnded}
          />
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
              <Ionicons name="checkmark-circle" size={28} color={colors.green} />
              <View style={styles.completedTextContainer}>
                <Text style={[styles.completedTitle, { fontFamily: typography.families.rounded }]}>Video Completed! 🎉</Text>
                <Text style={[styles.completedSubtitle, { fontFamily: typography.families.rounded }]}>You're ready to proceed to the next activity.</Text>
              </View>
            </View>
            <Button label="Next Activity" variant="success" onPress={handleNextPress} style={styles.nextBtn} />
          </Card>
        ) : (
          <View style={styles.infoSection}>
            <Text style={[styles.videoTitle, { fontFamily: typography.families.rounded }]}>{currentVideo?.title || 'Video Lesson'}</Text>
            <Text style={[styles.videoInstructions, { fontFamily: typography.families.rounded }]}>
              Watch the video demonstration carefully to prepare for the tracing activities.
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

const VideoComingSoonMobile: React.FC<{
  video: any;
  navigation: any;
}> = ({ video, navigation }) => {
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
    <ScreenContainer style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <Text style={[styles.backLinkText, { fontFamily: typography.families.rounded }]}>Back</Text>
        </Pressable>
        <Text style={[styles.topBarTitle, { fontFamily: typography.families.rounded }]} numberOfLines={1}>
          {video.title}
        </Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Main Coming Soon Area */}
      <View style={styles.comingSoonPanel}>
        <Card style={styles.comingSoonCard}>
          <Ionicons name="film-outline" size={56} color={colors.yellow} style={styles.comingSoonIcon} />
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
    </ScreenContainer>
  );
};

export const VideoMobile: React.FC = () => {
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
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isComingSoon = currentVideo.filename === 'coming_soon' || currentVideo.videoUrl?.includes('coming_soon');

  if (isComingSoon) {
    return <VideoComingSoonMobile video={currentVideo} navigation={navigation} />;
  }

  return (
    <VideoPlayerMobile
      currentVideo={currentVideo}
      currentPosition={currentPosition}
      duration={duration}
      isCompleted={isCompleted}
      savePosition={savePosition}
      completeVideo={completeVideo}
      navigation={navigation}
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
  backButton: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
  },
  backButtonText: {
    color: '#FFF8ED',
    fontWeight: typography.weights.bold,
  },
  topBar: {
    height: 60,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  backLinkText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    flex: 1,
    textAlign: 'center',
  },
  playerPanel: {
    flex: 0.6,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  videoCard: {
    backgroundColor: 'transparent',
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
    flex: 0.4,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    alignItems: 'center',
    maxWidth: '100%',
  },
  videoTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  videoInstructions: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  completedSection: {
    width: '100%',
    gap: spacing.md,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    height: 48,
  },
  endedOverlay: {
    backgroundColor: 'rgba(59,52,47,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonPanel: {
    flex: 0.6,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  comingSoonCard: {
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  comingSoonIcon: {
    marginBottom: spacing.md,
  },
  comingSoonTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  comingSoonSubtitle: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  comingSoonDetails: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
  },
  proceedBtn: {
    width: '100%',
    maxWidth: 300,
    height: 50,
  },
});

export default VideoMobile;
