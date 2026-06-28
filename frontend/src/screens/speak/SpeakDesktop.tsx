import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useSpeakStore } from '../../store/speakStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UniversalSpeechRecognizer } from '../../utils/speechRecognition';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { AvatarCard } from '../../components/cards/AvatarCard';

export const SpeakDesktop: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

  const {
    activityId,
    targetPhrase,
    transcript,
    confidence,
    stars,
    isRecording,
    isCompleted,
    loading,
    error,
    startRecording,
    stopRecording,
    retry,
    completeActivity,
  } = useSpeakStore();

  const [recognizer, setRecognizer] = useState<UniversalSpeechRecognizer | null>(null);
  const [localRecording, setLocalRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const rec = new UniversalSpeechRecognizer();
    setRecognizer(rec);

    return () => {
      rec.stop();
    };
  }, []);

  const handleMicPress = () => {
    if (!recognizer) return;

    if (localRecording) {
      recognizer.stop();
      setLocalRecording(false);
    } else {
      startRecording();
      setLocalRecording(true);
      setErrorMessage(null);

      recognizer.start(
        async (res) => {
          setLocalRecording(false);
          const success = await stopRecording(res.transcript, res.confidence);
          if (!success) {
            setErrorMessage("That's not quite right, let's try again! 🌸");
            retry();
          }
        },
        (err) => {
          console.warn('Speech recognition error:', err);
          setLocalRecording(false);
          
          let friendlyMsg = 'Speech recognition failed.';
          if (err?.message) {
            if (err.message.includes('no-speech')) {
              friendlyMsg = "We didn't hear anything. Please tap the mic and try again!";
            } else if (err.message.includes('not-allowed') || err.message.includes('Permission')) {
              friendlyMsg = "Microphone permission not granted. Please allow it in settings.";
            } else if (err.message.includes('busy')) {
              friendlyMsg = "Speech recognizer is busy. Please try again in a moment.";
            } else if (err.message.includes('network')) {
              friendlyMsg = "Network connection issue. Please make sure your device/emulator has internet access, or use 'Skip / Demo Mode' if testing offline.";
            } else {
              friendlyMsg = err.message;
            }
          }
          setErrorMessage(friendlyMsg);
          retry();
        }
      );
    }
  };

  const handleNextActivity = async () => {
    if (!activityId) return;
    const next = getNextActivity(activityId);
    if (next) {
      await navigateToActivity(navigation, next);
    } else {
      navigation.navigate('LessonComplete');
    }
  };

  const handleSkipOrForceComplete = async () => {
    await completeActivity(90);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={styles.statusText}>Loading speak activity...</Text>
      </View>
    );
  }

  if (error || !activityId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle" size={48} color="#FF4A4A" />
        <Text style={styles.errorText}>{error || 'Speak activity could not be loaded'}</Text>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Speak & Learn" showBack />
      
      {/* Activity Progress Header Indicator */}
      <View style={styles.progressHeader}>
        <View style={styles.indicatorRow}>
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
          <View style={styles.stepLineActive} />
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
          <View style={styles.stepLineActive} />
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>3</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepDot}><Text style={styles.stepNum}>4</Text></View>
        </View>
        <View style={styles.heartIndicator}>
          <Text style={styles.heartText}>💖 3 Lives</Text>
        </View>
      </View>

      <View style={styles.layout}>
        {/* Middle Panel: Workspace */}
        <View style={styles.mainArea}>
          <View style={styles.cardWrapper}>
            <Text style={[styles.guideTitle, { fontFamily: typography.families.rounded }]}>Microphone Studio</Text>
            
            <View style={styles.phraseCard}>
              <View style={styles.mascotBadge}>
                <Text style={styles.mascotEmoji}>🦉</Text>
              </View>
              <Text style={[styles.speakLabel, { fontFamily: typography.families.rounded }]}>Practice Speaking:</Text>
              <Text style={[styles.targetPhraseText, { fontFamily: typography.families.rounded }]}>"{targetPhrase}"</Text>
            </View>

            <View style={styles.interactionZone}>
              {localRecording ? (
                <View style={styles.recordingSection}>
                  <View style={styles.waveContainer}>
                    <View style={[styles.waveBar, styles.waveBar1]} />
                    <View style={[styles.waveBar, styles.waveBar2]} />
                    <View style={[styles.waveBar, styles.waveBar3]} />
                    <View style={[styles.waveBar, styles.waveBar4]} />
                    <View style={[styles.waveBar, styles.waveBar3]} />
                    <View style={[styles.waveBar, styles.waveBar2]} />
                    <View style={[styles.waveBar, styles.waveBar1]} />
                  </View>
                  <Text style={[styles.listeningText, { fontFamily: typography.families.rounded }]}>Recording... speak clearly into your microphone.</Text>
                </View>
              ) : transcript ? (
                <View style={styles.resultSection}>
                  <Text style={[styles.resultLabel, { fontFamily: typography.families.rounded }]}>Transcription:</Text>
                  <Text style={[styles.transcriptText, { fontFamily: typography.families.rounded }]}>"{transcript}"</Text>
                  
                  <View style={styles.meterContainer}>
                    <Text style={[styles.meterLabel, { fontFamily: typography.families.rounded }]}>Confidence Level:</Text>
                    <View style={styles.meterTrack}>
                      <View
                        style={[
                          styles.meterFill,
                          { width: `${confidence}%` },
                          confidence >= 70 ? styles.meterFillSuccess : styles.meterFillFail,
                        ]}
                      />
                    </View>
                    <Text style={[styles.meterScoreText, { fontFamily: typography.families.rounded }]}>{confidence}%</Text>
                  </View>
                  {stars !== null && (
                    <View style={styles.starsRow}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < (stars || 0) ? "star" : "star-outline"}
                          size={24}
                          color="#FFD700"
                          style={{ marginHorizontal: 2, marginTop: 8 }}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : errorMessage ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="warning-outline" size={20} color="#FF4A4A" />
                  <Text style={[styles.errorAlertText, { fontFamily: typography.families.rounded }]}>{errorMessage}</Text>
                </View>
              ) : (
                <Text style={[styles.instructionText, { fontFamily: typography.families.rounded }]}>
                  Click the microphone button when you are ready to practice speaking.
                </Text>
              )}

              <View style={styles.micArea}>
                <Pressable
                  style={({ pressed }) => [
                    styles.micOuterBtn,
                    localRecording && styles.micOuterBtnRecording,
                    pressed && styles.micOuterBtnPressed,
                  ]}
                  onPress={handleMicPress}
                >
                  <View style={[styles.micInnerBtn, localRecording && styles.micInnerBtnRecording]}>
                    <Ionicons
                      name={localRecording ? 'stop' : 'mic'}
                      size={48}
                      color="#FFF8ED"
                    />
                  </View>
                </Pressable>
                <Text style={[styles.micHint, { fontFamily: typography.families.rounded }]}>
                  {localRecording ? 'Click to Stop Recording' : 'Click to Speak'}
                </Text>
              </View>
            </View>

            <View style={styles.actionSection}>
              {isCompleted ? (
                <Pressable
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
                  style={styles.skipBtn}
                  onPress={handleSkipOrForceComplete}
                >
                  <Text style={[styles.skipBtnText, { fontFamily: typography.families.rounded }]}>Skip / Demo Mode</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Right Panel: Mentor Cheerleader */}
        <View style={styles.sidebar}>
          <Text style={[styles.sidebarTitle, { fontFamily: typography.families.rounded }]}>Mentor Guide</Text>
          <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
          <View style={styles.mentorBubble}>
            <Text style={[styles.tipsText, { fontFamily: typography.families.rounded }]}>
              "Speaking time is my absolute favorite, {activeChild?.name}! Make sure to clear your throat, click the big mic icon, and speak the phrase. Let's see how close you can get to 100%!"
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.illustrationCard,
    padding: spacing.xl,
    ...shadows.md,
  },
  guideTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.largeTitle,
    fontWeight: typography.weights.black,
    marginBottom: spacing.md,
  },
  phraseCard: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.lg,
    ...shadows.sm,
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
  speakLabel: {
    color: colors.purple,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  targetPhraseText: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  interactionZone: {
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  instructionText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.small,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  listeningText: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.small,
    marginTop: spacing.sm,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 54,
  },
  waveBar: {
    width: 6,
    backgroundColor: colors.purple,
    borderRadius: 3,
  },
  waveBar1: { height: 20 },
  waveBar2: { height: 36 },
  waveBar3: { height: 50 },
  waveBar4: { height: 28 },
  resultSection: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginVertical: spacing.xs,
    textAlign: 'center',
  },
  meterContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  meterLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  meterTrack: {
    width: '60%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterFillSuccess: {
    backgroundColor: colors.green,
  },
  meterFillFail: {
    backgroundColor: colors.coral,
  },
  meterScoreText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFEBEB',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#FFC1C1',
    marginBottom: spacing.lg,
  },
  errorAlertText: {
    color: colors.coral,
    fontSize: typography.sizes.small,
  },
  micArea: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  micOuterBtn: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(139, 120, 216, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 120, 216, 0.25)',
  },
  micOuterBtnRecording: {
    backgroundColor: 'rgba(242, 154, 143, 0.15)',
    borderColor: 'rgba(242, 154, 143, 0.25)',
  },
  micOuterBtnPressed: {
    transform: [{ scale: 0.96 }],
  },
  micInnerBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  micInnerBtnRecording: {
    backgroundColor: colors.coral,
  },
  micHint: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  actionSection: {
    alignItems: 'center',
    width: '100%',
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
  actionBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  actionBtnText: {
    color: '#FFF8ED',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.body,
  },
  nextBtn: {
    backgroundColor: colors.green,
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  skipBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textDecorationLine: 'underline',
  },
  sidebar: {
    width: 320,
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
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default SpeakDesktop;
