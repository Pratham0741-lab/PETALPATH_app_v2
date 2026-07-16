import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../../theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface Props {
  visible: boolean;
  duration?: number;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  colors.purple,
  colors.yellow,
  colors.blue,
  colors.success,
  colors.orange,
  colors.pink,
];

const PIECE_COUNT = 14;

interface Piece {
  color: string;
  left: number;
  delay: number;
  drift: number;
  rotate: number;
}

const PIECES: Piece[] = Array.from({ length: PIECE_COUNT }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: (i * 7 + 4) % 100,
  delay: (i % 5) * 120,
  drift: (i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 15),
  rotate: (i % 2 === 0 ? 1 : -1) * (180 + i * 20),
}));

export const ConfettiOverlay: React.FC<Props> = ({ visible, duration = 2500, onComplete }) => {
  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onComplete]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {PIECES.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} duration={duration} />
      ))}
    </View>
  );
};

interface PieceProps {
  piece: Piece;
  duration: number;
}

const ConfettiPiece: React.FC<PieceProps> = ({ piece, duration }) => {
  const translateY = useSharedValue(-40);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const fallDuration = duration - piece.delay;
    translateY.value = withTiming(600, {
      duration: fallDuration,
      easing: Easing.linear,
    });
    translateX.value = withSequence(
      withTiming(piece.drift, { duration: fallDuration / 2, easing: Easing.inOut(Easing.ease) }),
      withTiming(piece.drift * 1.4, { duration: fallDuration / 2, easing: Easing.inOut(Easing.ease) })
    );
    rotate.value = withRepeat(
      withTiming(piece.rotate, { duration: fallDuration, easing: Easing.linear }),
      -1,
      false
    );
    opacity.value = withTiming(0, { duration: fallDuration, easing: Easing.linear });
  }, [piece, duration, translateY, translateX, rotate, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          backgroundColor: piece.color,
          left: `${piece.left}%`,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
  },
  piece: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
