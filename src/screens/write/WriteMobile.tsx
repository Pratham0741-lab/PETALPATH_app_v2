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
        <View style={styles.indicatorRow}>
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
          <View style={styles.stepLineActive} />
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>2</Text></View>
          <View style={styles.stepLineActive} />
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>3</Text></View>
          <View style={styles.stepLineActive} />
          <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>4</Text></View>
        </View>
        <View style={styles.heartIndicator}>
          <Text style={styles.heartText}>💖 3 Lives</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.headerInfo}>
          <View style={styles.mascotBadge}>
            <Text style={styles.mascotEmoji}>🦉</Text>
          </View>
          <Text style={[styles.activityLabel, { fontFamily: typography.families.rounded }]}>Trace the shape:</Text>
          <Text style={[styles.guideNameText, { fontFamily: typography.families.rounded }]}>{guideName}</Text>
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
                <Text style={[styles.congratsText, { fontFamily: typography.families.rounded }]}>Tracing complete! Beautiful job!</Text>
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
                  <Text style={[styles.scoreText, { fontFamily: typography.families.rounded }]}>Accuracy: {accuracyScore}%</Text>
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
                <Text style={[styles.actionBtnText, { fontFamily: typography.families.rounded }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF8ED" />
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.tipText, { fontFamily: typography.families.rounded }]}>
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
  headerInfo: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    position: 'relative',
    ...shadows.sm,
  },
  mascotBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: '#FFF8ED',
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotEmoji: {
    fontSize: 20,
  },
  activityLabel: {
    color: colors.purple,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guideNameText: {
    color: colors.textPrimary,
    fontSize: 22,
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
    backgroundColor: '#E2F0D9',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#A8D08D',
    marginBottom: spacing.xs,
  },
  congratsText: {
    color: colors.green,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.small,
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
    color: colors.textSecondary,
    fontWeight: '600',
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
  tipText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.caption,
    textAlign: 'center',
  },
});
export default WriteMobile;
