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
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { AvatarCard } from '../../components/cards/AvatarCard';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

export const ListenTablet: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

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
      setFeedback('Correct! Incredible work! 🎉');
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
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const btnVariants = [
    { bg: colors.blue, border: '#4A7CBD', text: '#FFF8ED' },
    { bg: colors.green, border: '#6C9955', text: '#FFF8ED' },
    { bg: colors.yellow, border: '#D6A628', text: colors.brown },
    { bg: colors.coral, border: '#D07E73', text: '#FFF8ED' },
  ];

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Listen & Choose" showBack />
      
      {/* Progress & Lives row */}
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
          <Text style={styles.heartText}>💖 3 Lives</Text>
        </View>
      </View>

      <View style={styles.layout}>
        {/* Left Side: Playback and choices */}
        <View style={styles.mainArea}>
          <View style={styles.playSection}>
            <Pressable
              ref={speakerRef}
              style={[
                styles.speakerBtn,
                isPlaying && styles.speakerBtnPlaying,
              ]}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                size={40}
                color={isPlaying ? '#FFF8ED' : colors.purple}
              />
              <Text style={[
                styles.speakerBtnText, 
                isPlaying && styles.speakerBtnTextPlaying,
                { fontFamily: typography.families.rounded }
              ]}>
                {isPlaying ? 'Playing Sound...' : 'Click to Play Sound'}
              </Text>
            </Pressable>
            {isComingSoon && (
              <Text style={styles.comingSoonText}>Audio Coming Soon</Text>
            )}
            
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${playProgress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.optionsContainer}>
            <Text style={[styles.promptText, { fontFamily: typography.families.rounded }]}>Select the matching card:</Text>
            <View style={styles.optionsGrid}>
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
                      pressed && !answered && { transform: [{ scale: 0.97 }] },
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
                      <Ionicons name="checkmark-circle" size={26} color="#FFF8ED" />
                    )}
                    {answered && isSelected && !isCorrectAnswer && (
                      <Ionicons name="close-circle" size={26} color="#FFF8ED" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.actionSection}>
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

        {/* Right Side: Mentor Assistance */}
        <View style={styles.sidebar}>
          <Text style={[styles.sidebarTitle, { fontFamily: typography.families.rounded }]}>Mascot Buddy</Text>
          <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
          <View style={styles.mentorBubble}>
            <Text style={[styles.tipsText, { fontFamily: typography.families.rounded }]}>
              "Hi {activeChild?.name}! Click the button to listen, then select the matching button! You are doing great! 🌸"
            </Text>
          </View>
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
    width: 48,
    height: 3,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    width: 48,
    height: 3,
    backgroundColor: colors.purple,
  },
  heartIndicator: {
    backgroundColor: '#FFEBEB',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: '#FFC1C1',
  },
  heartText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainArea: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  playSection: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  speakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
    backgroundColor: colors.purple,
    ...shadows.sm,
  },
  speakerBtnPlaying: {
    backgroundColor: colors.green,
  },
  speakerBtnText: {
    color: '#FFF8ED',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.body,
  },
  speakerBtnTextPlaying: {
    color: '#FFF8ED',
  },
  comingSoonText: {
    color: colors.orange,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  progressContainer: {
    width: '90%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.purple,
  },
  optionsContainer: {
    marginVertical: spacing.md,
  },
  promptText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  optionCard: {
    width: '48%',
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
  sidebar: {
    width: 280,
    backgroundColor: colors.background,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  sidebarTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  mentorCard: {
    width: '100%',
  },
  mentorBubble: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.sm,
  },
  tipsText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.small,
    lineHeight: 18,
  },
});
export default ListenTablet;
