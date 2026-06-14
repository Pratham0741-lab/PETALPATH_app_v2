import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useListenStore } from '../../store/listenStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UniversalAudioPlayer } from '../../utils/audioPlayer';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { AvatarCard } from '../../components/cards/AvatarCard';

export const ListenDesktop: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

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
      setFeedback('Sensational! You got it right!');
    } else {
      setFeedback('That is not quite it. Try again!');
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
      
      <View style={styles.layout}>
        {/* Middle Panel: Interactive Dashboard */}
        <View style={styles.mainArea}>
          <View style={styles.cardWrapper}>
            <Text style={styles.guideTitle}>Sound Lab</Text>
            
            <View style={styles.playSection}>
              <Pressable
                style={({ hovered }: any) => [
                  styles.speakerBtn,
                  isPlaying && styles.speakerBtnPlaying,
                  hovered && styles.speakerBtnHovered,
                ]}
                onPress={handlePlayPause}
              >
                <Ionicons
                  name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                  size={54}
                  color={isPlaying ? colors.white : colors.purple}
                />
                <Text style={[styles.speakerBtnText, isPlaying && styles.speakerBtnTextPlaying]}>
                  {isPlaying ? 'Audio playing...' : 'Click to hear the pronunciation'}
                </Text>
              </Pressable>
              {isComingSoon && (
                <Text style={styles.comingSoonText}>Audio Coming Soon</Text>
              )}
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${playProgress * 100}%` }]} />
              </View>
            </View>

            <View style={styles.optionsSection}>
              <Text style={styles.promptText}>Select the matching card:</Text>
              <View style={styles.optionsRow}>
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
                      style={({ pressed, hovered }: any) => [
                        ...cardStyle,
                        hovered && !answered && styles.optionCardHovered,
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
            </View>

            <View style={styles.actionSection}>
              {feedback && (
                <View style={[styles.feedbackContainer, feedback.includes('Correct') ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              )}

              {!answered ? (
                <Pressable
                  style={({ pressed, hovered }: any) => [
                    styles.actionBtn,
                    !selectedAnswer && styles.actionBtnDisabled,
                    hovered && selectedAnswer && styles.actionBtnHovered,
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
                      style={({ pressed, hovered }: any) => [
                        styles.actionBtn,
                        styles.nextBtn,
                        hovered && styles.actionBtnHovered,
                        pressed && styles.actionBtnPressed,
                      ]}
                      onPress={handleNextActivity}
                    >
                      <Text style={styles.actionBtnText}>Next Activity</Text>
                      <Ionicons name="arrow-forward" size={20} color={colors.white} />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={({ pressed, hovered }: any) => [
                        styles.actionBtn,
                        styles.retryBtn,
                        hovered && styles.actionBtnHovered,
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
        </View>

        {/* Right Panel: Mentor Cheerleader */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Mentor Guide</Text>
          <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
          <View style={styles.mentorBubble}>
            <Text style={styles.tipsText}>
              "Look at that! Listening is the superpower of learning! Listen to Penny Panda say the word, then select the card below. Let's see if we can get all correct answers today!"
            </Text>
          </View>
        </View>
      </View>
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
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainArea: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    ...shadows.md,
  },
  guideTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    marginBottom: spacing.md,
  },
  playSection: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  speakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.purple + '12',
    borderWidth: 1,
    borderColor: colors.purple + '20',
  },
  speakerBtnPlaying: {
    backgroundColor: colors.purple,
  },
  speakerBtnHovered: {
    backgroundColor: colors.purple + '22',
  },
  speakerBtnText: {
    color: colors.purple,
    fontWeight: typography.weights.black,
    fontSize: typography.sizes.md,
  },
  speakerBtnTextPlaying: {
    color: colors.white,
  },
  comingSoonText: {
    color: '#F97316', // Sleek orange color
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  progressContainer: {
    width: '80%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  optionsSection: {
    marginBottom: spacing.xl,
  },
  promptText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  optionCardHovered: {
    borderColor: colors.purple + '50',
    backgroundColor: colors.purple + '05',
  },
  optionCardSelected: {
    borderColor: colors.purple,
    backgroundColor: colors.purple + '08',
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
  actionSection: {
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
  actionBtnHovered: {
    opacity: 0.95,
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
  sidebar: {
    width: 300,
    backgroundColor: colors.background,
    padding: spacing.xl,
    alignItems: 'center',
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  mentorCard: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  mentorBubble: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.sm,
  },
});
