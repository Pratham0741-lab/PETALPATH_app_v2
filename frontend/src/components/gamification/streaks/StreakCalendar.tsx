import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../../theme';
import { EmptyState } from '../../../components/common/EmptyState';

interface StreakDay {
  date: string;
  active: boolean;
}

interface StreakCalendarProps {
  days: StreakDay[];
  weeks?: number;
  style?: StyleProp<ViewStyle>;
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({ days, weeks, style }) => {
  if (!days || days.length === 0) {
    return <EmptyState message="No streak days yet" />;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.grid}>
        {days.map((day) => (
          <View
            key={day.date}
            style={[
              styles.cell,
              day.active ? styles.cellActive : styles.cellInactive,
            ]}
          >
            {day.active ? (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.xs / 2,
  },
  cellActive: {
    backgroundColor: colors.orange,
  },
  cellInactive: {
    borderWidth: 1,
    borderColor: colors.textMuted,
    backgroundColor: colors.transparent,
  },
});

export default StreakCalendar;
