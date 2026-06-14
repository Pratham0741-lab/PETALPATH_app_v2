import React from 'react';
import { StyleSheet, View, Text, Image, StyleProp, ViewStyle, Pressable } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { AppCard } from './AppCard';
import { Ionicons } from '@expo/vector-icons';

interface VideoCardProps {
  title: string;
  thumbnailUrl: string | null;
  duration: number; // in seconds
  isCompleted?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  title,
  thumbnailUrl,
  duration,
  isCompleted = false,
  onPress,
  style,
}) => {
  const formatDuration = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')} mins`;
  };

  return (
    <AppCard onPress={onPress} style={[styles.card, style]}>
      <View style={styles.thumbnailContainer}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="videocam" size={48} color={colors.purple} style={styles.placeholderIcon} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playButtonCircle}>
            <Ionicons name="play" size={24} color={colors.white} style={styles.playIcon} />
          </View>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      </View>
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.green} />
            </View>
          )}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    ...shadows.sm,
  },
  thumbnailContainer: {
    width: '100%',
    height: 160,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.purple + '10',
  },
  placeholderIcon: {
    opacity: 0.6,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  playIcon: {
    marginLeft: 3, // nudge for optical centering
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  durationText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  infoContainer: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  completedBadge: {
    marginLeft: spacing.xs,
  },
});
