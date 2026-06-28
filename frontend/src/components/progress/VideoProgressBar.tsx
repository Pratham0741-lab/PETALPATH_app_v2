import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';

interface VideoProgressBarProps {
  currentTime: number; // in seconds
  duration: number; // in seconds
  onSeek?: (time: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  style,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  const handleTrackPress = (event: any) => {
    if (onSeek && trackWidth > 0) {
      const locationX = event.nativeEvent.locationX;
      const pct = Math.max(0, Math.min(1, locationX / trackWidth));
      onSeek(pct * duration);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Time Display Row */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Text style={styles.percentageText}>{percentage}%</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Interactive Progress Track */}
      <Pressable
        style={styles.trackContainer}
        onPress={handleTrackPress}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.trackBackground}>
          <View style={[styles.trackFill, { width: `${clampedProgress * 100}%` }]} />
          {/* Thumb Handle */}
          <View
            style={[
              styles.thumb,
              { left: `${clampedProgress * 100}%`, transform: [{ translateX: -8 }] },
            ]}
          />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  percentageText: {
    color: colors.purple,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  trackContainer: {
    height: 20, // larger hit target area
    justifyContent: 'center',
    width: '100%',
  },
  trackBackground: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    position: 'relative',
    width: '100%',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.purple,
    borderRadius: radius.full,
  },
  thumb: {
    position: 'absolute',
    top: -4, // vertically center inside trackBackground
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.purple,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
