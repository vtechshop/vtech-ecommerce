import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface PulseOptions {
  minScale?: number;
  maxScale?: number;
  duration?: number;
  active?: boolean;
}

export function usePulse(options: PulseOptions = {}) {
  const { minScale = 0.95, maxScale = 1.08, duration = 600, active = true } = options;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(minScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 200 });
    }

    return () => cancelAnimation(scale);
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}
