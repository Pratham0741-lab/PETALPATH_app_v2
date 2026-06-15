import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { TopBar } from '../../components/navigation/TopBar';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useWriteStore } from '../../store/writeStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TracingCanvas } from '../../components/canvas/TracingCanvas';
import { getNextActivity, navigateToActivity } from '../../utils/navigationFlow';
import { getGuidePoints, calculateTracingAccuracy, getStarsFromScore } from '../../utils/tracingAccuracy';
import { NavigationGuide } from '../../components/tutorial/NavigationGuide';

export const WriteMobile: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    activityId,
    guideName,
    strokes,
    isCompleted,
    accuracyScore,
    stars,
    loading,
    error,
    addStroke,
    undo,
    clear,
    completeActivity,
  } = useWriteStore();

  const [answered, setAnswered] = useState(false);

  const nextBtnRef = useRef<View>(null);
  const [handCoords, setHandCoords] = useState<{ x: number; y: number } | undefined>(undefined);
  const [traceCoords, setTraceCoords] = useState<{ startX: number; startY: number; endX: number; endY: number } | undefined>(undefined);

  const handleGuideLayout = React.useCallback((startX: number, startY: number, endX: number, endY: number) => {
    setTraceCoords({ startX, startY, endX, endY });
  }, []);

  const measureTarget = () => {
    if (answered || isCompleted) {
      if (nextBtnRef.current) {
        nextBtnRef.current.measureInWindow((x, y, width, height) => {
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
  }, [answered, isCompleted, traceCoords]);

  const handleCompleteTracing = async (w: number, h: number) => {
    if (strokes.length === 0) {
      Alert.alert('Draw Something First', 'Please trace the guide lines before checking your answer.');
      return;
    }
    
    const guidePoints = getGuidePoints(guideName, w, h);
    const score = calculateTracingAccuracy(strokes, guidePoints);
    
    if (score < 40) {
      Alert.alert(
        "That's not quite right",
        "Let's try again! Try to stay as close as possible to the dashed guidelines.",
        [{ text: "Try Again", onPress: () => clear() }]
      );
      return;
    }

    const starsCount = getStarsFromScore(score);
    await completeActivity(score, starsCount);
    setAnswered(true);
  };

  const handleNextPress = async () => {
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
        <Text style={styles.statusText}>Loading tracing board...</Text>
      </View>
    );
  }

  if (error || !activityId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle" size={48} color="#FF4A4A" />
        <Text style={styles.errorText}>{error || 'Tracing activity could not be loaded'}</Text>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <TopBar title="Trace & Draw" showBack />
      
      {/* Activity Progress Header Indicator */}
      <View style={styles.progressHeader}>
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
        <View style={styles.stepLineActive} />
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
        <View style={styles.stepLineActive} />
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>3</Text></View>
        <View style={styles.stepLineActive} />
        <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>4</Text></View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerInfo}>
          <Text style={styles.activityLabel}>Trace the shape:</Text>
          <Text style={styles.guideNameText}>{guideName}</Text>
        </View>

        <View style={styles.canvasWrapper}>
          <TracingCanvas
            guideName={guideName}
            strokes={strokes}
            onAddStroke={addStroke}
            onUndo={undo}
            onClear={clear}
            onComplete={handleCompleteTracing}
            isCompleted={isCompleted}
            onGuideLayout={handleGuideLayout}
          />
        </View>

        <View style={styles.actionPanel}>
          {answered || isCompleted ? (
            <View style={styles.completePanel}>
              <View style={styles.congratsRow}>
                <Ionicons name="checkmark-circle" size={24} color={colors.green} />
                <Text style={styles.congratsText}>Tracing complete! Beautiful job!</Text>
              </View>
              {accuracyScore !== null && (
                <View style={styles.starsContainer}>
                  <View style={styles.starsRow}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < (stars || 0) ? "star" : "star-outline"}
                        size={32}
                        color="#FFD700"
                        style={{ marginHorizontal: 4 }}
                      />
                    ))}
                  </View>
                  <Text style={styles.scoreText}>Accuracy: {accuracyScore}%</Text>
                </View>
              )}
              <Pressable
                ref={nextBtnRef as any}
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.nextBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={handleNextPress}
              >
                <Text style={styles.actionBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </Pressable>
            </View>
          ) : (
            <Text style={styles.tipText}>
              Start from the top and trace slowly along the lines.
            </Text>
          )}
        </View>
      </View>
      <NavigationGuide
        screenKey="write"
        guideKey="write"
        message="Trace slowly!"
        showHand={answered || isCompleted ? !!handCoords : !!traceCoords}
        handMode={answered || isCompleted ? 'tap' : 'move'}
        handX={answered || isCompleted ? handCoords?.x : traceCoords?.startX}
        handY={answered || isCompleted ? handCoords?.y : traceCoords?.startY}
        handStartX={traceCoords?.startX}
        handStartY={traceCoords?.startY}
        handEndX={traceCoords?.endX}
        handEndY={traceCoords?.endY}
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
  headerInfo: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activityLabel: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guideNameText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: typography.weights.black,
  },
  canvasWrapper: {
    flex: 1,
    marginVertical: spacing.md,
  },
  actionPanel: {
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  completePanel: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  congratsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.green + '12',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green + '25',
    marginBottom: spacing.xs,
  },
  congratsText: {
    color: colors.green,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  starsContainer: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
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
  tipText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
});
export default WriteMobile;
