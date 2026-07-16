import React from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows, breakpoints } from '../../theme';
import { Skeleton } from '../ui/Skeleton';

interface ProgressWidgetsProps {
  overallProgress?: number;
  curriculumCompletion?: number;
  currentMastery?: number;
  xp?: number;
  streak?: number;
  badgesCount?: number;
  skillsMastered?: number;
  loading?: boolean;
}

interface WidgetItem {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

export const ProgressWidgets: React.FC<ProgressWidgetsProps> = ({
  overallProgress,
  curriculumCompletion,
  currentMastery,
  xp,
  streak,
  badgesCount,
  skillsMastered,
  loading = false,
}) => {
  const { width } = useWindowDimensions();
  const columns = width < breakpoints.tabletMax ? 2 : 4;

  if (loading) {
    return (
      <View style={[styles.grid, { flexWrap: 'wrap' }]}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.widget, { width: columns === 2 ? '48%' : '23%' }]}>
            <Skeleton variant="circle" width={28} height={28} />
            <Skeleton width={32} height={24} style={{ marginTop: spacing.sm }} />
            <Skeleton width={60} height={12} style={{ marginTop: spacing.xs }} />
          </View>
        ))}
      </View>
    );
  }

  const widgets: WidgetItem[] = [
    ...(typeof overallProgress === 'number' ? [{ label: 'Overall Progress', value: `${overallProgress}%`, icon: 'pie-chart' as const, color: colors.purple }] : []),
    ...(typeof curriculumCompletion === 'number' ? [{ label: 'Curriculum', value: `${curriculumCompletion}%`, icon: 'book' as const, color: colors.blue }] : []),
    ...(typeof currentMastery === 'number' ? [{ label: 'Mastery', value: `${currentMastery}%`, icon: 'trophy' as const, color: colors.success }] : []),
    ...(typeof xp === 'number' ? [{ label: 'Total XP', value: xp, icon: 'flash' as const, color: colors.accent }] : []),
    ...(typeof streak === 'number' ? [{ label: 'Day Streak', value: streak, icon: 'flame' as const, color: colors.orange }] : []),
    ...(typeof badgesCount === 'number' ? [{ label: 'Badges', value: badgesCount, icon: 'medal' as const, color: colors.accent }] : []),
    ...(typeof skillsMastered === 'number' ? [{ label: 'Skills', value: skillsMastered, icon: 'checkmark-circle' as const, color: colors.success }] : []),
  ];

  if (widgets.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.grid, { flexWrap: 'wrap' }]}
      accessibilityLabel="Learning progress widgets"
      accessibilityRole="summary"
    >
      {widgets.map((widget) => (
        <View
          key={widget.label}
          style={[styles.widget, { width: columns === 2 ? '48%' : '23%' }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${widget.color}18` }]}>
            <Ionicons name={widget.icon} size={16} color={widget.color} />
          </View>
          <Text style={styles.value}>{widget.value}</Text>
          <Text style={styles.label}>{widget.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  widget: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default ProgressWidgets;
