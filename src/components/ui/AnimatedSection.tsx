import React from 'react';
import { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAnimatedEntry } from '../../hooks/useAnimatedEntry';

interface AnimatedSectionProps {
  delay?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function AnimatedSection({ delay = 0, children, style }: AnimatedSectionProps) {
  const animatedStyle = useAnimatedEntry(delay);

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
