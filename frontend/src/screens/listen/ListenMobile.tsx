import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useListenStore } from '../../store/listenStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UniversalAudioPlayer } from '../../utils/audioPlayer';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

export const ListenMobile: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    currentAudio,
    selectedAnswer,
    correctAnswer,
    options,
    loading,
    error,
    selectAnswer,
    submitAnswer,
    retry,
    isComingSoon,
  } = useListenStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<UniversalAudioPlayer | null>(null);
  const [playProgress, setPlayProgress] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const speakerRef = useRef<View>(null);
  const actionBtnRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);

  const measureTarget = () => {
    if (answered) {
      if (actionBtnRef.current) {
        actionBtnRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else if (!selectedAnswer) {
      if (speakerRef.current) {
        speakerRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else {
      if (actionBtnRef.current) {
        actionBtnRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(measureTarget, 200);
    return () => clearTimeout(timer);
  }, [answered, selectedAnswer, isPlaying, currentAudio]);

  useEffect(() => {
    if (currentAudio) {
      const audioPlayer = new UniversalAudioPlayer(
        currentAudio.audioUrl,
        () => {
          setIsPlaying(false);
          setPlayProgress(1);
        },
        (pos, dur) => {
          if (dur > 0) {
            setPlayProgress(pos / dur);
          }
        }
      );
      setPlayer(audioPlayer);

      return () => {
        audioPlayer.unload();
      };
    }
  }, [currentAudio]);

  const handlePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const handleOptionPress = (option: string) => {
    if (answered) return;
    selectAnswer(option);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;
    const isCorrect = await submitAnswer();
    setAnswered(true);
    if (isCorrect) {
      setFeedback('Correct! Splendid job! 🎉');
    } else {
      setFeedback('Not quite, try again! 🌸');
    }
  };

  const handleRetry = () => {
    retry();
    setAnswered(false);
    setFeedback(null);
  };

  const handleNextActivity = async () => {
    if (!currentAudio) return;
    const next = getNextActivity(currentAudio.activityId);
    if (next) {
      await navigateToActivity(navigation, next);
    } else if (next === null) {
      navigation.navigate('LessonComplete');
    } else {
      navigation.navigate('LessonOverview');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={styles.statusText}>Loading audio guide...</Text>
      </View>
    );
  }

  if (error || !currentAudio) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle" size={48} color="#FF4A4A" />
        <Text style={styles.errorText}>{error || 'Audio guide could not be loaded'}</Text>
        <Pressable style={styles.errorBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBackText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Answer buttons color variant mapping
  const btnVariants = [
    { bg: colors.blue, border: '#4A7CBD', text: '#FFF8ED' },
    { bg: colors.green, border: '#6C9955', text: '#FFF8ED' },
    { bg: colors.yellow, border: '#D6A628', text: colors.brown },
    { bg: colors.coral, border: '#D07E73', text: '#FFF8ED' },
  ];

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Listen & Choose" showBack />
      
      {/* Activity Progress Header Indicator with Heart Icon */}
      <View style={styles.progressHeader}>
        <View style={styles.indicatorRow}>
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
          <View style={styles.stepLineActive} />
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepDot}><Text style={styles.stepNum}>4</Text></View>
        </View>
        <View style={styles.heartIndicator}>
          <Text style={styles.heartText}>💖 3</Text>
        </View>
      </View>

      <View style={styles.content}>
        
        {/* Speaker Card with Mascot in top-right corner */}
        <Pressable
          ref={speakerRef}
          style={({ pressed }) => [
            styles.speakerCard,
            isPlaying && styles.speakerCardPlaying,
            pressed && styles.speakerCardPressed,
          ]}
          onPress={handlePlayPause}
        >
          {/* Owl mascot sitting in the corner */}
          <View style={styles.mascotBadge}>
            <Text style={styles.mascotEmoji}>🦉</Text>
          </View>

          <View style={styles.speakerOuterRing}>
            <View style={styles.speakerInnerRing}>
              <Ionicons
                name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                size={56}
                color={isPlaying ? '#FFF8ED' : colors.purple}
              />
            </View>
          </View>
          <Text style={[styles.speakerLabel, { fontFamily: typography.families.rounded }]}>
            {isPlaying ? 'Listening...' : 'Tap to Listen'}
          </Text>
          {isComingSoon && (
            <Text style={styles.comingSoonText}>Audio Coming Soon</Text>
          )}
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${playProgress * 100}%` }]} />
          </View>
        </Pressable>

        {/* Options List with Height 90 & Radius 24 & color variant borders */}
        <View style={styles.optionsContainer}>
          <Text style={[styles.promptText, { fontFamily: typography.families.rounded }]}>What shape or line did you hear?</Text>
          {options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isCorrectAnswer = correctAnswer === opt;
            
            const variant = btnVariants[idx % btnVariants.length];
            
            let cardBg = variant.bg;
            let cardBorder = variant.border;
            let cardText = variant.text;
            let currentBorderWidth = 3;

            if (answered) {
              if (isCorrectAnswer) {
                cardBg = colors.green;
                cardBorder = '#6C9955';
                cardText = '#FFF8ED';
              } else if (isSelected) {
                cardBg = colors.coral;
                cardBorder = '#D07E73';
                cardText = '#FFF8ED';
              } else {
                cardBg = '#F8EEDC';
                cardBorder = '#E6DAC4';
                cardText = colors.textMuted;
                currentBorderWidth = 1.5;
              }
            } else if (selectedAnswer && !isSelected) {
              cardBg = '#F8EEDC';
              cardBorder = '#E6DAC4';
              cardText = colors.textMuted;
              currentBorderWidth = 1.5;
            }

            return (
              <Pressable
                key={opt}
                style={({ pressed }) => [
                  styles.optionCard,
                  { 
                    backgroundColor: cardBg, 
                    borderColor: cardBorder, 
                    borderWidth: currentBorderWidth 
                  },
                  pressed && !answered && { transform: [{ scale: 0.96 }] },
                ]}
                onPress={() => handleOptionPress(opt)}
                disabled={answered}
              >
                <Text style={[
                  styles.optionText, 
                  { 
                    color: cardText,
                    fontFamily: typography.families.rounded,
                  }
                ]}>{opt}</Text>
                
                {answered && isCorrectAnswer && (
                  <Ionicons name="checkmark-circle" size={28} color="#FFF8ED" />
                )}
                {answered && isSelected && !isCorrectAnswer && (
                  <Ionicons name="close-circle" size={28} color="#FFF8ED" />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Action Panel */}
        <View style={styles.actionPanel}>
          {feedback && (
            <View style={[styles.feedbackContainer, feedback.includes('Correct') ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
              <Text style={[styles.feedbackText, { fontFamily: typography.families.rounded }]}>{feedback}</Text>
            </View>
          )}

          {!answered ? (
            <Pressable
              ref={actionBtnRef}
              style={({ pressed }) => [
                styles.actionBtn,
                !selectedAnswer && styles.actionBtnDisabled,
                pressed && selectedAnswer && styles.actionBtnPressed,
              ]}
              onPress={handleSubmit}
              disabled={!selectedAnswer}
            >
              <Text style={[styles.actionBtnText, { fontFamily: typography.families.rounded }]}>Check Answer</Text>
            </Pressable>
          ) : (
            <View style={styles.nextActionsRow}>
              {feedback?.includes('Correct') ? (
                <Pressable
                  ref={actionBtnRef}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.nextBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={handleNextActivity}
                >
                  <Text style={[styles.actionBtnText, { fontFamily: typography.families.rounded }]}>Next Activity</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF8ED" />
                </Pressable>
              ) : (
                <Pressable
                  ref={actionBtnRef}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.retryBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={handleRetry}
                >
                  <Ionicons name="refresh" size={20} color="#FFF8ED" />
                  <Text style={[styles.actionBtnText, { fontFamily: typography.families.rounded }]}>Try Again</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
      <NavigationGuide
        screenKey="listen"
        guideKey="listen"
        message="Listen carefully!"
        showHand={!!handCoords}
        handMode={answered || selectedAnswer ? 'tap' : 'bounce'}
        handX={handCoords?.x}
        handY={handCoords?.y}
      />
    </ScreenContainer>
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
  errorBackBtn: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
  },
  errorBackText: {
    color: '#FFF8ED',
    fontWeight: typography.weights.bold,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: colors.purple,
  },
  stepNum: {
    color: '#FFF8ED',
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  stepLine: {
    width: 32,
    height: 3,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    width: 32,
    height: 3,
    backgroundColor: colors.purple,
  },
  heartIndicator: {
    backgroundColor: '#FFEBEB',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: '#FFC1C1',
  },
  heartText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  speakerCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.illustrationCard,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    position: 'relative',
    ...shadows.md,
  },
  speakerCardPlaying: {
    borderColor: colors.purple,
    backgroundColor: '#F8EEFC',
  },
  speakerCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  mascotBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: '#FFF8ED',
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  mascotEmoji: {
    fontSize: 26,
  },
  speakerOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 120, 216, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerInnerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(139, 120, 216, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerLabel: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.body,
    marginTop: spacing.md,
  },
  comingSoonText: {
    color: colors.orange,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  progressContainer: {
    width: '80%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.xs,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  promptText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  optionCard: {
    height: 90, // SPEC height 90
    borderRadius: 24, // SPEC radius 24
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  optionText: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
  },
  actionPanel: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  feedbackContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  feedbackCorrect: {
    backgroundColor: '#E2F0D9',
  },
  feedbackIncorrect: {
    backgroundColor: '#FFEBEB',
  },
  feedbackText: {
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.small,
  },
  actionBtn: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    height: 56,
    ...shadows.sm,
  },
  actionBtnDisabled: {
    backgroundColor: colors.border,
    opacity: 0.7,
  },
  actionBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  actionBtnText: {
    color: '#FFF8ED',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.body,
  },
  nextActionsRow: {
    width: '100%',
  },
  nextBtn: {
    backgroundColor: colors.green,
  },
  retryBtn: {
    backgroundColor: colors.purple,
  },
});
export default ListenMobile;
