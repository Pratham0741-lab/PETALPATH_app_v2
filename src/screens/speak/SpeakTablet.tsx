import React, { useState, useEffect, useRef } from 'react';
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
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

export const SpeakTablet: React.FC = () => {
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

  const micRef = useRef<View>(null);
  const actionBtnRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);

  const measureTarget = () => {
    if (isCompleted) {
      if (actionBtnRef.current) {
        actionBtnRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else if (!localRecording) {
      if (micRef.current) {
        micRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setHandCoords({ x: x + width / 2, y: y + height / 2 });
          }
        });
      }
    } else {
      setHandCoords(undefined);
    }
  };

  useEffect(() => {
    const timer = setTimeout(measureTarget, 200);
    return () => clearTimeout(timer);
  }, [isCompleted, localRecording]);

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
            setErrorMessage("That's not quite right, let's try again!");
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
      
      <View style={styles.layout}>
        {/* Left Panel: Microphone and Audio Waveform */}
        <View style={styles.mainArea}>
          <View style={styles.phraseCard}>
            <Text style={styles.speakLabel}>Practice Speaking:</Text>
            <Text style={styles.targetPhraseText}>"{targetPhrase}"</Text>
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
                <Text style={styles.listeningText}>I'm listening...</Text>
              </View>
            ) : transcript ? (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>What I heard:</Text>
                <Text style={styles.transcriptText}>"{transcript}"</Text>
                
                <View style={styles.meterContainer}>
                  <Text style={styles.meterLabel}>Confidence Level:</Text>
                  <View style={styles.meterTrack}>
                    <View
                      style={[
                        styles.meterFill,
                        { width: `${confidence}%` },
                        confidence >= 70 ? styles.meterFillSuccess : styles.meterFillFail,
                      ]}
                    />
                  </View>
                  <Text style={styles.meterScoreText}>{confidence}%</Text>
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
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : (
              <Text style={styles.instructionText}>
                Tap the record button below to speak!
              </Text>
            )}

            <View style={styles.micArea}>
              <Pressable
                ref={micRef}
                onLayout={measureTarget}
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
                    size={44}
                    color={colors.white}
                  />
                </View>
              </Pressable>
              <Text style={styles.micHint}>
                {localRecording ? 'Tap to Stop' : 'Tap to Speak'}
              </Text>
            </View>
          </View>

          <View style={styles.actionSection}>
            {isCompleted ? (
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
                style={styles.skipBtn}
                onPress={() => completeActivity(85)}
              >
                <Text style={styles.skipBtnText}>Skip / Demo Mode</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Right Panel: Mentor Cheerleader */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Speak Guide</Text>
          <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
          <View style={styles.mentorBubble}>
            <Text style={styles.tipsText}>
              "Speech time, {activeChild?.name}! Press the microphone and speak clearly. Try your best to get above 70% match score! Let's roar like tigers!"
            </Text>
          </View>
        </View>
      </View>
      <NavigationGuide
        screenKey="speak"
        guideKey="speak"
        message="Say it loud!"
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
  phraseCard: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  speakLabel: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  targetPhraseText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  interactionZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xl,
    width: '100%',
  },
  instructionText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  listeningText: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 48,
  },
  waveBar: {
    width: 5,
    backgroundColor: colors.purple,
    borderRadius: 2.5,
  },
  waveBar1: { height: 16 },
  waveBar2: { height: 32 },
  waveBar3: { height: 44 },
  waveBar4: { height: 24 },
  resultSection: {
    width: '80%',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  resultLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: colors.text,
    fontSize: typography.sizes.md,
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
    color: colors.textMuted,
    marginBottom: 4,
  },
  meterTrack: {
    width: '85%',
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
    backgroundColor: '#FF4A4A',
  },
  meterScoreText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 4,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FF4A4A12',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FF4A4A25',
    marginBottom: spacing.md,
  },
  errorAlertText: {
    color: '#FF4A4A',
    fontSize: typography.sizes.sm,
  },
  micArea: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  micOuterBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.purple + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.purple + '30',
  },
  micOuterBtnRecording: {
    backgroundColor: '#FF4A4A20',
    borderColor: '#FF4A4A30',
  },
  micOuterBtnPressed: {
    transform: [{ scale: 0.96 }],
  },
  micInnerBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  micInnerBtnRecording: {
    backgroundColor: '#FF4A4A',
  },
  micHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  actionSection: {
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
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
  actionBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  nextBtn: {
    backgroundColor: colors.green,
  },
  skipBtn: {
    paddingVertical: spacing.xs,
  },
  skipBtnText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textDecorationLine: 'underline',
  },
  sidebar: {
    width: 280,
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
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default SpeakTablet;
