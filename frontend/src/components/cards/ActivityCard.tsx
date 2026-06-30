import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';

export type ActivityType = 'listen' | 'speak' | 'write' | 'video' | 'stories';

interface ActivityCardProps {
  title: string;
  duration: string;
  type: ActivityType;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  locked?: boolean;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  duration,
  type,
  onPress,
  style,
  locked = false,
}) => {
  const getThemeColor = () => {
    if (locked) {
      return '#A0A0A0'; // Grayed out for locked state
    }
    switch (type) {
      case 'listen':
        return colors.blue;
      case 'speak':
        return colors.purple;
      case 'write':
        return colors.green;
      case 'video':
        return '#EF4444'; // Red accent for video
      case 'stories':
        return colors.yellow;
      default:
        return colors.purple;
    }
  };

  const getIconName = (): string => {
    switch (type) {
      case 'listen':
        return 'headset';
      case 'speak':
        return 'mic';
      case 'write':
        return 'pencil';
      case 'video':
        return 'play-circle';
      case 'stories':
        return 'book';
      default:
        return 'help-circle';
    }
  };

  const color = getThemeColor();

  return (
    <AppCard
      onPress={locked ? undefined : onPress}
      style={[
        styles.card,
        { borderLeftColor: color, borderLeftWidth: 6 },
        locked && { opacity: 0.55 },
        style,
      ]}
    >
      <View style={styles.container}>
        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
          <Ionicons name={getIconName() as any} size={24} color={color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
        <Ionicons
          name={locked ? 'lock-closed' : 'chevron-forward'}
          size={20}
          color={colors.textMuted}
        />
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  duration: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
});
