import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useSpeakStore } from '../../store/speakStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { UniversalSpeechRecognizer } from '../../utils/speechRecognition';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

export const SpeakMobile: React.FC = () => {
  const navigation = useNavigation<any>();
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
      // Stop
      recognizer.stop();
      setLocalRecording(false);
    } else {
      // Start
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

  const handleSkipOrForceComplete = async () => {
    // Helpful debugging fallback in emulator/browser contexts without mic access
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
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
        <View style={styles.stepLineActive} />
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
        <View style={styles.stepLineActive} />
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>3</Text></View>
        <View style={styles.stepLine} />
        <View style={styles.stepDot}><Text style={styles.stepNum}>4</Text></View>
      </View>

      <View style={styles.content}>
        {/* Practice Phrase Display */}
        <View style={styles.phraseCard}>
          <Text style={styles.speakLabel}>Say out loud:</Text>
          <Text style={styles.targetPhraseText}>"{targetPhrase}"</Text>
        </View>

        {/* Dynamic Wave/Status Box */}
        <View style={styles.statusBox}>
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
              <Text style={styles.listeningText}>Listening closely...</Text>
            </View>
          ) : transcript ? (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>You said:</Text>
              <Text style={styles.transcriptText}>"{transcript}"</Text>
              
              <View style={styles.meterContainer}>
                <Text style={styles.meterLabel}>Match Confidence:</Text>
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
              Tap the microphone and read the phrase clearly.
            </Text>
          )}
        </View>

        {/* Microphone Pulse Area */}
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
                size={40}
                color={colors.white}
              />
            </View>
          </Pressable>
        </View>

        {/* Action button drawer */}
        <View style={styles.actionPanel}>
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
              onPress={handleSkipOrForceComplete}
            >
              <Text style={styles.skipBtnText}>Skip / Demo Mode</Text>
            </Pressable>
          )}
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
    alignItems: 'center',
  },
  phraseCard: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
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
    fontSize: 26,
    fontWeight: typography.weights.black,
    textAlign: 'center',
  },
  statusBox: {
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  instructionText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  listeningText: {
    color: colors.purple,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  recordingSection: {
    alignItems: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
  },
  waveBar: {
    width: 4,
    backgroundColor: colors.purple,
    borderRadius: 2,
  },
  waveBar1: { height: 12 },
  waveBar2: { height: 24 },
  waveBar3: { height: 32 },
  waveBar4: { height: 16 },
  resultSection: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
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
    width: '80%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
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
  },
  errorAlertText: {
    color: '#FF4A4A',
    fontSize: typography.sizes.sm,
  },
  micArea: {
    marginVertical: spacing.xl,
  },
  micOuterBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  micInnerBtnRecording: {
    backgroundColor: '#FF4A4A',
  },
  actionPanel: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
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
    paddingVertical: spacing.sm,
  },
  skipBtnText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textDecorationLine: 'underline',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default SpeakMobile;
