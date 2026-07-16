import React, { useEffect } from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, radius, shadows, breakpoints } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { Skeleton } from '../ui/Skeleton';
import type { AdaptiveProfile } from '../../services/api/intelligenceApi';

type Modality = AdaptiveProfile['preferredModality'];
type Trend = AdaptiveProfile['trend'];

const FACE_MAP: Record<string, string> = {
  low: '\uD83D\uDE22',
  medium_low: '\uD83D\uDE15',
  medium: '\uD83D\uDE10',
  medium_high: '\uD83D\uDE42',
  high: '\uD83D\uDE04',
};

const MODALITY_ICON: Record<Modality, React.ComponentProps<typeof Ionicons>['name']> = {
  visual: 'eye-outline',
  auditory: 'ear-outline',
  kinesthetic: 'hand-left-outline',
  reading: 'book-outline',
  mixed: 'options-outline',
};

const MODALITY_LABEL: Record<Modality, string> = {
  visual: 'Visual',
  auditory: 'Auditory',
  kinesthetic: 'Kinesthetic',
  reading: 'Reading',
  mixed: 'Mixed',
};

function getFace(engagement: number): string {
  if (engagement < 20) return FACE_MAP.low;
  if (engagement < 40) return FACE_MAP.medium_low;
  if (engagement < 60) return FACE_MAP.medium;
  if (engagement < 80) return FACE_MAP.medium_high;
  return FACE_MAP.high;
}

function getDifficultyLevel(value: number): { label: string; bars: number; color: string } {
  if (value <= 20) return { label: 'Very Easy', bars: 1, color: '#8DBB75' };
  if (value <= 40) return { label: 'Easy', bars: 2, color: '#A8D094' };
  if (value <= 60) return { label: 'Moderate', bars: 3, color: '#F7C94B' };
  if (value <= 80) return { label: 'Hard', bars: 4, color: '#F2A15F' };
  return { label: 'Very Hard', bars: 5, color: '#E57373' };
}

function getTrendIcon(trend: Trend): React.ComponentProps<typeof Ionicons>['name'] {
  if (trend === 'improving') return 'arrow-up-circle';
  if (trend === 'declining') return 'arrow-down-circle';
  return 'remove-circle';
}

function getTrendColor(trend: Trend, themeColors: Record<string, string>): string {
  if (trend === 'improving') return themeColors.success ?? '#8DBB75';
  if (trend === 'declining') return themeColors.error ?? '#E57373';
  return themeColors.textMuted ?? '#A09A95';
}

const AnimatedView = Animated.View;

function useFadeInUp(index: number = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(
      index * 80,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
    translateY.value = withDelay(
      index * 80,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}

interface BaseWidgetProps {
  loading?: boolean;
  index?: number;
}

interface WidgetMomentumProps extends BaseWidgetProps {
  value?: number;
  trend?: Trend;
}

function WidgetMomentum({ value = 0, trend = 'stable', loading, index = 0 }: WidgetMomentumProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(value, { duration: 800, easing: Easing.out(Easing.ease) });
  }, [value, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={40} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Momentum: ${value} percent, trend ${trend}`}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${themeColors.purple}18` }]}>
        <Ionicons name="speedometer-outline" size={18} color={themeColors.purple} />
      </View>
      <Text style={[styles.value, { color: themeColors.text }]}>{Math.round(value)}%</Text>
      <View style={styles.trendRow}>
        <Ionicons
          name={getTrendIcon(trend)}
          size={14}
          color={getTrendColor(trend, themeColors)}
        />
        <Text style={[styles.trendLabel, { color: getTrendColor(trend, themeColors) }]}>
          {trend}
        </Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: `${themeColors.purple}20` }]}>
        <AnimatedView style={[styles.progressFill, { backgroundColor: themeColors.purple }, progressStyle]} />
      </View>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Momentum</Text>
    </AnimatedView>
  );
}

interface WidgetEngagementProps extends BaseWidgetProps {
  value?: number;
}

function WidgetEngagement({ value = 0, loading, index = 0 }: WidgetEngagementProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 100 });
  }, [value, scale]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={40} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={64} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Engagement: ${Math.round(value)} percent`}
      accessibilityRole="summary"
    >
      <AnimatedView style={faceStyle}>
        <Text style={styles.emoji} accessibilityElementsHidden>{getFace(value)}</Text>
      </AnimatedView>
      <Text style={[styles.value, { color: themeColors.text }]}>{Math.round(value)}%</Text>
      <View style={[styles.progressBar, { backgroundColor: `${themeColors.coral}20` }]}>
        <View style={[styles.progressFill, { backgroundColor: themeColors.coral, width: `${value}%` }]} />
      </View>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Engagement</Text>
    </AnimatedView>
  );
}

interface WidgetConfidenceProps extends BaseWidgetProps {
  value?: number;
}

function WidgetConfidence({ value = 0, loading, index = 0 }: WidgetConfidenceProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={40} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Confidence: ${Math.round(value)} percent`}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${themeColors.success}18` }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={themeColors.success} />
      </View>
      <Text style={[styles.value, { color: themeColors.text }]}>{Math.round(value)}%</Text>
      <View style={[styles.progressBar, { backgroundColor: `${themeColors.success}20` }]}>
        <View style={[styles.progressFill, { backgroundColor: themeColors.success, width: `${value}%` }]} />
      </View>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Confidence</Text>
    </AnimatedView>
  );
}

interface WidgetDifficultyProps extends BaseWidgetProps {
  value?: number;
}

function WidgetDifficulty({ value = 0, loading, index = 0 }: WidgetDifficultyProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);
  const { label, bars, color } = getDifficultyLevel(value);

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={60} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Difficulty: ${label}`}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name="stats-chart-outline" size={18} color={color} />
      </View>
      <Text style={[styles.value, { color: themeColors.text }]}>{label}</Text>
      <View style={styles.barsRow}>
        {[1, 2, 3, 4, 5].map((b) => (
          <View
            key={b}
            style={[
              styles.bar,
              {
                backgroundColor: b <= bars ? color : `${themeColors.border}`,
                height: 6 + b * 3,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Difficulty</Text>
    </AnimatedView>
  );
}

interface WidgetLearningSpeedProps extends BaseWidgetProps {
  value?: number;
}

function WidgetLearningSpeed({ value = 0, loading, index = 0 }: WidgetLearningSpeedProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={40} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Learning speed: ${Math.round(value)} percent`}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${themeColors.secondary}18` }]}>
        <Ionicons name="rocket-outline" size={18} color={themeColors.secondary} />
      </View>
      <Text style={[styles.value, { color: themeColors.text }]}>{Math.round(value)}%</Text>
      <View style={[styles.progressBar, { backgroundColor: `${themeColors.secondary}20` }]}>
        <View style={[styles.progressFill, { backgroundColor: themeColors.secondary, width: `${value}%` }]} />
      </View>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Learning Speed</Text>
    </AnimatedView>
  );
}

interface WidgetModalityProps extends BaseWidgetProps {
  value?: Modality;
}

function WidgetModality({ value = 'visual', loading, index = 0 }: WidgetModalityProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={64} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Preferred modality: ${MODALITY_LABEL[value]}`}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${themeColors.lavender}18` }]}>
        <Ionicons name={MODALITY_ICON[value]} size={18} color={themeColors.lavender} />
      </View>
      <Text style={[styles.value, { color: themeColors.text, fontSize: typography.sizes.lg }]}>
        {MODALITY_LABEL[value]}
      </Text>
      <Text style={[styles.modalityHint, { color: themeColors.textSecondary }]}>
        {value === 'visual' ? 'Learns by seeing' :
         value === 'auditory' ? 'Learns by hearing' :
         value === 'kinesthetic' ? 'Learns by doing' :
         value === 'reading' ? 'Learns by reading' : 'Mixed approach'}
      </Text>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Modality</Text>
    </AnimatedView>
  );
}

interface WidgetConsistencyProps extends BaseWidgetProps {
  value?: number;
}

function WidgetConsistency({ value = 0, loading, index = 0 }: WidgetConsistencyProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(value, { duration: 800, easing: Easing.out(Easing.ease) });
  }, [value, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={40} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Consistency: ${Math.round(value)} percent`}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${themeColors.leafGreen}18` }]}>
        <Ionicons name="calendar-outline" size={18} color={themeColors.leafGreen} />
      </View>
      <Text style={[styles.value, { color: themeColors.text }]}>{Math.round(value)}%</Text>
      <View style={[styles.progressBar, { backgroundColor: `${themeColors.leafGreen}20` }]}>
        <AnimatedView style={[styles.progressFill, { backgroundColor: themeColors.leafGreen }, progressStyle]} />
      </View>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Consistency</Text>
    </AnimatedView>
  );
}

interface WidgetFocusProps extends BaseWidgetProps {
  value?: number;
}

function WidgetFocus({ value = 0, loading, index = 0 }: WidgetFocusProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(value, { duration: 800, easing: Easing.out(Easing.ease) });
  }, [value, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={40} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Focus: ${Math.round(value)} percent`}
      accessibilityRole="summary"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${themeColors.skyBlue}18` }]}>
        <Ionicons name="locate-outline" size={18} color={themeColors.skyBlue} />
      </View>
      <Text style={[styles.value, { color: themeColors.text }]}>{Math.round(value)}%</Text>
      <View style={[styles.progressBar, { backgroundColor: `${themeColors.skyBlue}20` }]}>
        <AnimatedView style={[styles.progressFill, { backgroundColor: themeColors.skyBlue }, progressStyle]} />
      </View>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Focus</Text>
    </AnimatedView>
  );
}

interface WidgetTrendProps extends BaseWidgetProps {
  value?: Trend;
}

function WidgetTrend({ value = 'stable', loading, index = 0 }: WidgetTrendProps) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);
  const arrowColor = getTrendColor(value, themeColors);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 6, stiffness: 120 });
  }, [value, scale]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: themeColors.card }]}>
        <Skeleton variant="circle" width={28} height={28} />
        <Skeleton width={64} height={22} style={{ marginTop: spacing.sm }} />
        <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
      </View>
    );
  }

  return (
    <AnimatedView
      style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}
      accessibilityLabel={`Learning trend: ${value}`}
      accessibilityRole="summary"
    >
      <AnimatedView style={arrowStyle}>
        <Ionicons
          name={getTrendIcon(value)}
          size={28}
          color={arrowColor}
        />
      </AnimatedView>
      <Text style={[styles.value, { color: arrowColor, textTransform: 'capitalize' }]}>
        {value}
      </Text>
      <Text style={[styles.label, { color: themeColors.textMuted }]}>Trend</Text>
    </AnimatedView>
  );
}

function WidgetSkeleton({ index = 0 }: { index?: number }) {
  const { theme: { colors: themeColors } } = useTheme();
  const animatedStyle = useFadeInUp(index);

  return (
    <AnimatedView style={[styles.widget, { backgroundColor: themeColors.card }, animatedStyle]}>
      <Skeleton variant="circle" width={28} height={28} />
      <Skeleton width={40} height={22} style={{ marginTop: spacing.sm }} />
      <Skeleton width={72} height={12} style={{ marginTop: spacing.xs }} />
    </AnimatedView>
  );
}

export interface IntelligenceWidgetsProps {
  profile: AdaptiveProfile | null;
  loading?: boolean;
}

export function IntelligenceWidgets({ profile, loading = false }: IntelligenceWidgetsProps) {
  const { width } = useWindowDimensions();
  const { theme: { colors: themeColors } } = useTheme();

  let columns: number;
  if (width < breakpoints.mobileMax) {
    columns = 2;
  } else if (width < breakpoints.tabletMax) {
    columns = 3;
  } else {
    columns = 4;
  }

  if (loading) {
    return (
      <View
        style={[styles.grid, { columnGap: spacing.sm }]}
        accessibilityLabel="Loading intelligence widgets"
        accessibilityRole="progressbar"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.widget, { backgroundColor: themeColors.card, width: `${100 / columns - 2}%` }]}>
            <WidgetSkeleton index={i} />
          </View>
        ))}
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  const widgets: Array<{ key: string; component: React.ReactNode }> = [
    { key: 'momentum', component: <WidgetMomentum value={profile.momentum} trend={profile.trend} index={0} /> },
    { key: 'engagement', component: <WidgetEngagement value={profile.engagement} index={1} /> },
    { key: 'confidence', component: <WidgetConfidence value={profile.confidence} index={2} /> },
    { key: 'difficulty', component: <WidgetDifficulty value={profile.difficulty} index={3} /> },
    { key: 'learningSpeed', component: <WidgetLearningSpeed value={profile.learningSpeed} index={4} /> },
    { key: 'modality', component: <WidgetModality value={profile.preferredModality} index={5} /> },
    { key: 'consistency', component: <WidgetConsistency value={profile.consistency} index={6} /> },
    { key: 'focus', component: <WidgetFocus value={profile.focus} index={7} /> },
    { key: 'trend', component: <WidgetTrend value={profile.trend} index={8} /> },
  ];

  return (
    <View
      style={styles.grid}
      accessibilityLabel="Intelligence dashboard widgets"
      accessibilityRole="summary"
    >
      {widgets.map((w) => (
        <View key={w.key} style={{ width: `${100 / columns - 2}%` }}>
          {w.component}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  widget: {
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trendLabel: {
    fontSize: typography.sizes.xs,
    textTransform: 'capitalize',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: radius.xs,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: spacing.sm,
    height: 22,
  },
  bar: {
    width: 8,
    borderRadius: radius.xs,
  },
  modalityHint: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },
});

export default IntelligenceWidgets;
