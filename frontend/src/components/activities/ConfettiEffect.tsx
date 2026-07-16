import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8A5C', '#7C4DFF', '#FF4081', '#00E676'];

const CONFETTI_COUNT = 40;

interface ConfettiPieceProps {
  index: number;
  color: string;
  onFinish?: () => void;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index, color, onFinish }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(-40);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const startX = Math.random() * SCREEN_WIDTH * 0.8 - SCREEN_WIDTH * 0.4;
    const endY = SCREEN_HEIGHT * 0.5 + Math.random() * SCREEN_HEIGHT * 0.5;
    const duration = 2000 + Math.random() * 2000;
    const delay = index * 30;

    translateX.value = withDelay(delay, withTiming(startX, { duration, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(
      delay,
      withTiming(endY, { duration, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished && onFinish) runOnJS(onFinish)();
      }),
    );
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1),
    );
    opacity.value = withDelay(
      delay + duration - 300,
      withTiming(0, { duration: 300 }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const size = 6 + Math.random() * 10;
  const isCircle = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        styles.piece,
        animatedStyle,
        {
          width: size,
          height: isCircle ? size : size * 0.6,
          backgroundColor: color,
          borderRadius: isCircle ? size / 2 : 2,
        },
      ]}
    />
  );
};

interface ConfettiEffectProps {
  visible: boolean;
  duration?: number;
  onComplete?: () => void;
}

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ visible, onComplete }) => {
  const reduceMotion = useReducedMotion();
  const finishedCount = useRef(0);
  const totalPieces = reduceMotion ? 8 : CONFETTI_COUNT;

  if (!visible || reduceMotion) return null;

  const handlePieceFinish = () => {
    finishedCount.current += 1;
    if (finishedCount.current >= totalPieces && onComplete) {
      onComplete();
    }
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: totalPieces }).map((_, i) => (
        <ConfettiPiece
          key={i}
          index={i}
          color={COLORS[i % COLORS.length]}
          onFinish={handlePieceFinish}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  piece: {
    position: 'absolute',
    left: '50%',
    top: 0,
  },
});
