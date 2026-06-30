import React, { useState } from 'react';
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
import { useChildStore } from '../../store/childStore';
import { enhanceMentor, MENTORS } from '../../constants/mentors';
import { AvatarCard } from '../../components/cards/AvatarCard';

export const WriteDesktop: React.FC = () => {
  const navigation = useNavigation<any>();
  const activeChild = useChildStore((state) => state.activeChild);
  const activeMentor = enhanceMentor(activeChild?.mentor) || enhanceMentor(MENTORS[0])!;

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
      
      <View style={styles.layout}>
        {/* Center Panel: Workspace */}
        <View style={styles.mainArea}>
          <View style={styles.cardWrapper}>
            <View style={styles.headerInfo}>
              <Text style={styles.activityLabel}>Drawing board:</Text>
              <Text style={styles.guideNameText}>{guideName}</Text>
            </View>

            <View style={styles.canvasContainer}>
              <TracingCanvas
                guideName={guideName}
                strokes={strokes}
                onAddStroke={addStroke}
                onUndo={undo}
                onClear={clear}
                onComplete={handleCompleteTracing}
                isCompleted={isCompleted}
              />
            </View>

            <View style={styles.actionSection}>
              {(answered || isCompleted) && (
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
                    style={({ pressed, hovered }: any) => [
                      styles.actionBtn,
                      styles.nextBtn,
                      hovered && styles.actionBtnHovered,
                      pressed && styles.actionBtnPressed,
                    ]}
                    onPress={handleNextPress}
                  >
                    <Text style={styles.actionBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.white} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Right Panel: Mentor assistant */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Mentor Guide</Text>
          <AvatarCard mentor={activeMentor} style={styles.mentorCard} />
          <View style={styles.mentorBubble}>
            <Text style={styles.tipsText}>
              "Fabulous tracing awaits! Click and drag your mouse cursor on the screen to draw. Let's see if we can match the guide line perfectly!"
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
    flex: 1,
    maxHeight: 600,
    justifyContent: 'space-between',
    ...shadows.md,
  },
  headerInfo: {
    marginBottom: spacing.xs,
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
    fontSize: 26,
    fontWeight: typography.weights.black,
  },
  canvasContainer: {
    flex: 1,
    marginVertical: spacing.md,
  },
  actionSection: {
    alignItems: 'center',
    width: '100%',
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
  nextBtn: {
    backgroundColor: colors.green,
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
export default WriteDesktop;
