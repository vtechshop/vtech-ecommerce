import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Direction = 'up' | 'down' | 'left' | 'right';

interface SlideInOptions {
  direction?: Direction;
  delay?: number;
  distance?: number;
  useSpring?: boolean;
  duration?: number;
}

export function useSlideIn(options: SlideInOptions = {}) {
  const { direction = 'up', delay = 0, distance = 30, useSpring: springPhysics = false, duration = 400 } = options;
  const opacity = useSharedValue(0);
  const translate = useSharedValue(
    direction === 'up' || direction === 'left' ? distance : -distance
  );

  useEffect(() => {
    const moveAnim = springPhysics
      ? withSpring(0, { damping: 18, stiffness: 120 })
      : withTiming(0, { duration, easing: Easing.out(Easing.cubic) });

    opacity.value = withDelay(delay, withTiming(1, { duration: duration * 0.6, easing: Easing.out(Easing.cubic) }));
    translate.value = withDelay(delay, moveAnim);
  }, []);

  const isHorizontal = direction === 'left' || direction === 'right';

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: isHorizontal
      ? [{ translateX: translate.value }]
      : [{ translateY: translate.value }],
  }));

  return animatedStyle;
}
