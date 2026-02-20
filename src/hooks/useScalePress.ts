import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { haptic } from '../utils/haptics';

interface ScalePressOptions {
  scaleTo?: number;
  hapticType?: 'light' | 'selection' | 'none';
}

export function useScalePress(options: ScalePressOptions = {}) {
  const { scaleTo = 0.96, hapticType = 'none' } = options;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlers = {
    onPressIn: () => {
      scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
      if (hapticType === 'light') haptic.light();
      if (hapticType === 'selection') haptic.selection();
    },
    onPressOut: () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    },
  };

  return { animatedStyle, handlers };
}
