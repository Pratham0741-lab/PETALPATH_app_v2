import {
  SharedValue,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  AnimationCallback,
} from 'react-native-reanimated';

const DEFAULT_DURATION = 250;
const BOUNCE_SPRING_CONFIG = { damping: 8, stiffness: 150, mass: 0.5 };
const PULSE_DURATION = 800;
const PULSE_MIN_OPACITY = 0.3;
const SLIDE_DISTANCE = 50;
const ANIMATED_MOUNT_SLIDE = 24;

type AnimatedConfig = { duration: number; easing: EasingFunction };
type EasingFunction = (t: number) => number;

const easeOut = Easing.out(Easing.ease);
const easeInOut = Easing.inOut(Easing.ease);

export const fadeIn = (
  opacity: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  opacity.value = withTiming(1, { duration, easing: easeOut }, callback);
};

export const fadeOut = (
  opacity: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  opacity.value = withTiming(0, { duration, easing: easeOut }, callback);
};

export const slideInUp = (
  translateY: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateY.value = withTiming(0, { duration, easing: easeOut }, callback);
};

export const slideInDown = (
  translateY: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateY.value = withTiming(0, { duration, easing: easeOut }, callback);
};

export const slideInLeft = (
  translateX: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateX.value = withTiming(0, { duration, easing: easeOut }, callback);
};

export const slideInRight = (
  translateX: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateX.value = withTiming(0, { duration, easing: easeOut }, callback);
};

export const scaleIn = (
  scale: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  scale.value = withTiming(1, { duration, easing: easeOut }, callback);
};

export const scaleOut = (
  scale: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  scale.value = withTiming(0, { duration, easing: easeOut }, callback);
};

export const bounceIn = (
  scale: SharedValue<number>,
  callback?: AnimationCallback,
): void => {
  scale.value = withSequence(
    withTiming(1.2, { duration: 100, easing: easeOut }),
    withSpring(1, BOUNCE_SPRING_CONFIG, callback),
  );
};

export const pulse = (
  opacity: SharedValue<number>,
): void => {
  opacity.value = withRepeat(
    withSequence(
      withTiming(PULSE_MIN_OPACITY, { duration: PULSE_DURATION / 2, easing: easeInOut }),
      withTiming(1, { duration: PULSE_DURATION / 2, easing: easeInOut }),
    ),
    -1,
    true,
  );
};

export const animateProgress = (
  progress: SharedValue<number>,
  to: number,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  progress.value = withTiming(to, { duration, easing: easeOut }, callback);
};

export const slideOutUp = (
  translateY: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateY.value = withTiming(-SLIDE_DISTANCE, { duration, easing: easeOut }, callback);
};

export const slideOutDown = (
  translateY: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateY.value = withTiming(SLIDE_DISTANCE, { duration, easing: easeOut }, callback);
};

export const slideOutLeft = (
  translateX: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateX.value = withTiming(-SLIDE_DISTANCE, { duration, easing: easeOut }, callback);
};

export const slideOutRight = (
  translateX: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
  callback?: AnimationCallback,
): void => {
  translateX.value = withTiming(SLIDE_DISTANCE, { duration, easing: easeOut }, callback);
};

export const animateMount = (
  opacity: SharedValue<number>,
  translateY: SharedValue<number>,
  duration: number = DEFAULT_DURATION,
): void => {
  opacity.value = withTiming(1, { duration, easing: easeOut });
  translateY.value = withTiming(0, { duration, easing: easeOut });
};
