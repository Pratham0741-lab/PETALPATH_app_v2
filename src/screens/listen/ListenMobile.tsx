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
    isCompleted,
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
  }, [answered, selectedAnswer, isPlaying]);

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
      setFeedback('Correct! Breathtaking job!');
    } else {
      setFeedback('Not quite, try again!');
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
    } else {
      navigation.navigate('LessonComplete');
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
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Listen & Choose" showBack />
      
      {/* Activity Progress Header Indicator */}
      <View style={styles.progressHeader}>
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
        <View style={styles.stepLineActive} />
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
        <View style={styles.stepLine} />
        <View style={styles.stepDot}><Text style={styles.stepNum}>3</Text></View>
        <View style={styles.stepLine} />
        <View style={styles.stepDot}><Text style={styles.stepNum}>4</Text></View>
      </View>

      <View style={styles.content}>
        {/* Speaker Card */}
        <Pressable
          ref={speakerRef}
          onLayout={measureTarget}
          style={({ pressed }) => [
            styles.speakerCard,
            isPlaying && styles.speakerCardPlaying,
            pressed && styles.speakerCardPressed,
          ]}
          onPress={handlePlayPause}
        >
          <View style={styles.speakerOuterRing}>
            <View style={styles.speakerInnerRing}>
              <Ionicons
                name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                size={64}
                color={isPlaying ? colors.white : colors.purple}
              />
            </View>
          </View>
          <Text style={styles.speakerLabel}>
            {isPlaying ? 'Listening...' : 'Tap to Listen'}
          </Text>
          {isComingSoon && (
            <Text style={styles.comingSoonText}>Audio Coming Soon</Text>
          )}
          
          {/* Progress Bar inside Card */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${playProgress * 100}%` }]} />
          </View>
        </Pressable>

        {/* Options List */}
        <View style={styles.optionsContainer}>
          <Text style={styles.promptText}>What shape or line did you hear?</Text>
          {options.map((opt) => {
            const isSelected = selectedAnswer === opt;
            const isCorrectAnswer = correctAnswer === opt;
            
            let cardStyle: any = [styles.optionCard];
            let textStyle: any = [styles.optionText];
            
            if (isSelected) {
              cardStyle.push(styles.optionCardSelected);
              textStyle.push(styles.optionTextSelected);
            }
            
            if (answered) {
              if (isCorrectAnswer) {
                cardStyle.push(styles.optionCardCorrect);
                textStyle.push(styles.optionTextCorrect);
              } else if (isSelected) {
                cardStyle.push(styles.optionCardIncorrect);
                textStyle.push(styles.optionTextIncorrect);
              }
            }

            return (
              <Pressable
                key={opt}
                style={({ pressed }) => [
                  ...cardStyle,
                  pressed && !answered && { transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => handleOptionPress(opt)}
                disabled={answered}
              >
                <Text style={textStyle}>{opt}</Text>
                {answered && isCorrectAnswer && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.green} />
                )}
                {answered && isSelected && !isCorrectAnswer && (
                  <Ionicons name="close-circle" size={24} color="#FF4A4A" />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Action Panel */}
        <View style={styles.actionPanel}>
          {feedback && (
            <View style={[styles.feedbackContainer, feedback.includes('Correct') ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          )}

          {!answered ? (
            <Pressable
              ref={actionBtnRef}
              onLayout={measureTarget}
              style={({ pressed }) => [
                styles.actionBtn,
                !selectedAnswer && styles.actionBtnDisabled,
                pressed && selectedAnswer && styles.actionBtnPressed,
              ]}
              onPress={handleSubmit}
              disabled={!selectedAnswer}
            >
              <Text style={styles.actionBtnText}>Check Answer</Text>
            </Pressable>
          ) : (
            <View style={styles.nextActionsRow}>
              {feedback?.includes('Correct') ? (
                <Pressable
                  ref={actionBtnRef}
                  onLayout={measureTarget}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.nextBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={handleNextActivity}
                >
                  <Text style={styles.actionBtnText}>Next Activity</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </Pressable>
              ) : (
                <Pressable
                  ref={actionBtnRef}
                  onLayout={measureTarget}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.retryBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={handleRetry}
                >
                  <Ionicons name="refresh" size={20} color={colors.white} />
                  <Text style={styles.actionBtnText}>Try Again</Text>
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
        handMode="tap"
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
    color: colors.textMuted,
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
  },
  errorText: {
    color: colors.text,
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },
  backButtonText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    width: 40,
    height: 3,
    backgroundColor: colors.purple,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  speakerCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  speakerCardPlaying: {
    borderColor: colors.purple,
    backgroundColor: colors.purple + '10',
  },
  speakerCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  speakerOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.purple + '08',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerInnerRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.purple + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerLabel: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
    marginTop: spacing.md,
  },
  comingSoonText: {
    color: '#F97316', // Sleek orange color
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  promptText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  optionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  optionCardSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purple + '05',
  },
  optionCardCorrect: {
    borderColor: colors.green,
    backgroundColor: colors.green + '08',
  },
  optionCardIncorrect: {
    borderColor: '#FF4A4A',
    backgroundColor: '#FF4A4A08',
  },
  optionText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  optionTextSelected: {
    color: colors.purple,
  },
  optionTextCorrect: {
    color: colors.green,
  },
  optionTextIncorrect: {
    color: '#FF4A4A',
  },
  actionPanel: {
    gap: spacing.md,
    alignItems: 'center',
  },
  feedbackContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  feedbackCorrect: {
    backgroundColor: colors.green + '15',
  },
  feedbackIncorrect: {
    backgroundColor: '#FF4A4A15',
  },
  feedbackText: {
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  actionBtn: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    height: 54,
    ...shadows.md,
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
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
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
