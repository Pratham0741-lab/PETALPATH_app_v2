import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { colors, typography, spacing, radius, shadows, cardSizes } from '../../theme';
import { useVideoStore } from '../../store/videoStore';
import { useRoadmapStore } from '../../store/roadmapStore';
import {
  getActivityPosition,
  getNextActivity,
  navigateToActivity,
} from '../../utils/navigationFlow';
import {
  ActivityHeader,
  AppShell,
  Card,
  FeedbackBanner,
  IconButton,
  IconWell,
  PageHeader,
  PetalIcon,
  PrimaryButton,
  SecondaryButton,
} from '../../components/design';
import { ErrorState } from '../../components/common/ErrorState';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

/**
 * Watch (video lesson) — one implementation for all three device variants
 * (§28: "Do not duplicate the same UI markup across pages").
 *
 * The three files this replaces were 658-674 lines each and differed only in
 * chrome: how wide the player was allowed to get, whether the title came from
 * the video or the lesson, the wording of the back link, and — the one that
 * matters — whether the tutorial hand rendered at all. Desktop shipped without
 * `NavigationGuide`; that stays an explicit `guide: false` flag rather than
 * being quietly "fixed", because adding a tutorial overlay to a screen that
 * never had one is a behaviour change wearing a redesign's clothes (§1).
 *
 * Nothing in the playback pipeline is touched. `useVideoPlayer` is still
 * constructed with the same initialiser, the aspect-ratio probe still walks
 * `availableVideoTracks` and falls back to the DOM on web, the `useIsFocused`
 * pause, the duration poller, both `useEventListener` handlers (including the
 * 95%-of-duration completion trigger), `handleReplay` and `handleNextPress`
 * are all carried across verbatim.
 *
 * What changed is the chrome: the hand-rolled 56px top bar becomes
 * `ActivityHeader kind="watch"` (§15 gives WATCH pink), the Ionicons
 * play/film/refresh/check glyphs become `PetalIcon`s (§7), the legacy
 * `components/ui` Card/Button become the design-system ones, the four
 * "Next Activity ➔" labels lose their arrow glyph in favour of a real icon
 * slot, "Video Completed! 🎉" and "Video Demonstration 🌟" lose their emoji,
 * and the header's progress bar now reads the activity's real position in the
 * lesson instead of nothing at all (§33: no fake UI).
 */

export type VideoVariant = 'mobile' | 'tablet' | 'desktop';

/**
 * The video frame stays dark on purpose. §3's palette describes app surfaces;
 * a letterbox around a moving image is not a surface, and a warm-white one
 * would glow around every video. Two named constants, not scattered hex (§29).
 */
const FRAME_INK = '#1E1B18';
const FRAME_INK_SOFT = '#2A2421';

interface VideoVariantConfig {
  /** Widest the player frame is allowed to grow, as each variant shipped. */
  maxPlayerWidth: number;
  /**
   * Mobile named the screen after the video, the wide layouts after the lesson.
   * Both are real data pulled from a real store, so both are preserved.
   */
  titleSource: 'video' | 'lesson';
  /** Whether the tutorial hand renders at all — false on desktop, as shipped. */
  guide: boolean;
}

const VARIANTS: Record<VideoVariant, VideoVariantConfig> = {
  mobile: { maxPlayerWidth: 560, titleSource: 'video', guide: true },
  tablet: { maxPlayerWidth: 720, titleSource: 'lesson', guide: true },
  desktop: { maxPlayerWidth: 840, titleSource: 'lesson', guide: false },
};

const WATCH_INSTRUCTIONS =
  'Watch the video demonstration carefully to prepare for the tracing activities.';

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/**
 * Shared by the player and the coming-soon pane so the two can't drift apart.
 * The top-right shortcut is the same "Next" affordance all three variants had,
 * now a real `IconButton` with a spoken label instead of a pink pseudo-pill.
 */
const WatchHeader: React.FC<{
  title: string;
  activityId?: string;
  stepDone?: boolean;
  onNext: () => void;
}> = ({ title, activityId, stepDone = false, onNext }) => {
  const position = useMemo(
    () => (activityId ? getActivityPosition(activityId) : null),
    [activityId],
  );

  return (
    <ActivityHeader
      kind="watch"
      kindLabel="Watch & Learn"
      title={title}
      backLabel="Back to lesson"
      steps={position?.total}
      step={position?.index}
      progress={
        position ? ((position.index + (stepDone ? 1 : 0)) / position.total) * 100 : undefined
      }
      progressLabel={
        position ? `Activity ${position.index + 1} of ${position.total}` : undefined
      }
      right={
        <IconButton
          icon="forward"
          variant="solid"
          tone="brand"
          size="sm"
          onPress={onNext}
          accessibilityLabel="Next activity"
          accessibilityHint="Marks the video watched and moves on"
        />
      }
    />
  );
};

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

const VideoPlayerPane: React.FC<{
  cfg: VideoVariantConfig;
  headerTitle: string;
  currentVideo: any;
  currentPosition: number;
  duration: number;
  isCompleted: boolean;
  savePosition: (position: number) => Promise<void>;
  completeVideo: () => Promise<void>;
  navigation: any;
}> = ({
  cfg,
  headerTitle,
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
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

  // Initialize expo-video player
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
  const videoTitle = currentVideo?.title || 'Video Lesson';
  const done = videoEnded || isCompleted;

  return (
    <AppShell
      scroll={false}
      header={
        <WatchHeader
          title={headerTitle}
          activityId={currentVideo?.activityId}
          stepDone={done}
          onNext={handleNextPress}
        />
      }
      footer={
        <PrimaryButton
          label="Next Activity"
          iconRight="forward"
          tone={done ? 'green' : 'brand'}
          onPress={handleNextPress}
        />
      }
    >
      <View style={styles.stage}>
        {/* The computed aspect ratio drives the frame's height, so a portrait
            clip letterboxes tall rather than being squashed into 16:9. */}
        <View
          style={[
            styles.frame,
            { aspectRatio, maxWidth: cfg.maxPlayerWidth },
          ]}
        >
          {/* Always-present poster behind the player, so there is never a
              black hole while the first frame decodes. */}
          <View style={styles.poster}>
            <View style={styles.playCircle}>
              <PetalIcon
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color={colors.white}
                filled
              />
            </View>
            <Text style={styles.posterTitle} numberOfLines={1}>
              {videoTitle}
            </Text>
            <View style={styles.posterBadge}>
              <PetalIcon name="watch" size={14} color={colors.yellow} filled />
              <Text style={styles.posterBadgeText}>Demonstration Video</Text>
            </View>
          </View>

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
              <PrimaryButton
                label="Replay Video"
                icon="replay"
                fullWidth={false}
                onPress={handleReplay}
              />
            </View>
          )}
        </View>
      </View>

      {done ? (
        <FeedbackBanner
          tone="correct"
          message="Video complete! You're ready for the next activity."
        />
      ) : (
        <Card variant="flat" padding="normal">
          <Text style={[typography.presets.cardTitle, styles.infoTitle]} numberOfLines={2}>
            {videoTitle}
          </Text>
          <Text style={[typography.presets.subtle, styles.infoBody]}>
            {WATCH_INSTRUCTIONS}
          </Text>
        </Card>
      )}
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// Coming soon
// ---------------------------------------------------------------------------

const VideoComingSoonPane: React.FC<{
  headerTitle: string;
  video: any;
  navigation: any;
}> = ({ headerTitle, video, navigation }) => {
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
      const { selectedLesson } = useRoadmapStore.getState();
      if (selectedLesson) {
        await useRoadmapStore.getState().completeLesson(selectedLesson.id);
        navigation.navigate('LessonComplete');
      } else {
        navigation.navigate('MainTabs', { screen: 'Journey' });
      }
    } catch (err) {
      if (__DEV__) console.warn('Failed to complete and proceed:', err);
      const { selectedLesson } = useRoadmapStore.getState();
      if (selectedLesson) {
        navigation.navigate('LessonOverview', { lessonId: selectedLesson.id });
      } else {
        navigation.navigate('MainTabs', { screen: 'Journey' });
      }
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <AppShell
      scroll={false}
      header={
        <WatchHeader
          title={headerTitle}
          activityId={video?.activityId}
          onNext={handleProceed}
        />
      }
      footer={
        <PrimaryButton
          label="Next Activity"
          iconRight="forward"
          onPress={handleProceed}
          loading={isCompleting}
        />
      }
    >
      <View style={styles.center}>
        <Card
          variant="raised"
          padding="roomy"
          accent={colors.primary}
          style={styles.comingSoonCard}
        >
          <IconWell
            icon="watch"
            color={colors.primary}
            soft={colors.primaryLight}
            size={cardSizes.iconWellLarge}
          />
          <Text style={[typography.presets.section, styles.comingSoonTitle]}>
            Video Demonstration
          </Text>
          <Text style={[typography.presets.body, styles.comingSoonBody]}>
            {WATCH_INSTRUCTIONS}
          </Text>
          <Text style={[typography.presets.caption, styles.comingSoonBody]}>
            This one is still being filmed — tap the button below whenever you're
            ready to move on.
          </Text>
        </Card>
      </View>
    </AppShell>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const VideoContent: React.FC<{ variant: VideoVariant }> = ({ variant }) => {
  const cfg = VARIANTS[variant];
  const navigation = useNavigation<any>();
  const { selectedLesson } = useRoadmapStore();
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
      <AppShell scroll={false} header={<PageHeader title="Watch & Learn" />}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.presets.caption, styles.loadingText]}>
            Loading video…
          </Text>
        </View>
      </AppShell>
    );
  }

  if (error || !currentVideo) {
    return (
      <AppShell
        scroll={false}
        header={<PageHeader title="Watch & Learn" />}
        footer={<SecondaryButton label="Go Back" icon="back" onPress={() => navigation.goBack()} />}
      >
        <View style={styles.center}>
          <ErrorState
            title="Couldn't load this video"
            message={error || 'Video could not be loaded'}
          />
        </View>
      </AppShell>
    );
  }

  const headerTitle =
    cfg.titleSource === 'lesson'
      ? selectedLesson?.title || 'Video Activity'
      : currentVideo?.title || 'Video Lesson';

  const isComingSoon = currentVideo.filename === 'coming_soon' || currentVideo.videoUrl?.includes('coming_soon');

  // The tutorial hand is absolutely positioned over the whole screen, so it has
  // to sit outside AppShell rather than inside its content column.
  const guide = cfg.guide ? (
    <NavigationGuide screenKey="video" guideKey="video" message="Watch carefully!" />
  ) : null;

  if (isComingSoon) {
    return (
      <View style={styles.fill}>
        <VideoComingSoonPane
          headerTitle={headerTitle}
          video={currentVideo}
          navigation={navigation}
        />
        {guide}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <VideoPlayerPane
        cfg={cfg}
        headerTitle={headerTitle}
        currentVideo={currentVideo}
        currentPosition={currentPosition}
        duration={duration}
        isCompleted={isCompleted}
        savePosition={savePosition}
        completeVideo={completeVideo}
        navigation={navigation}
      />
      {guide}
    </View>
  );
};

export default VideoContent;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // ------------------------------------------------------------------ player
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  frame: {
    width: '100%',
    /* Keeps a tall clip inside the stage instead of pushing the info card off
       the bottom of the screen (§27). */
    maxHeight: '100%',
    backgroundColor: FRAME_INK,
    borderRadius: radius.cardInner,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  poster: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: FRAME_INK_SOFT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  playCircle: {
    width: 66,
    height: 66,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  posterTitle: {
    ...typography.presets.cardTitle,
    color: colors.white,
    textAlign: 'center',
  },
  posterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  posterBadgeText: {
    ...typography.presets.eyebrow,
    color: colors.yellow,
  },
  endedOverlay: {
    backgroundColor: 'rgba(48, 44, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // -------------------------------------------------------------------- info
  infoTitle: {
    color: colors.text,
  },
  infoBody: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ------------------------------------------------------------- coming soon
  comingSoonCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  comingSoonTitle: {
    color: colors.text,
    textAlign: 'center',
  },
  comingSoonBody: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
