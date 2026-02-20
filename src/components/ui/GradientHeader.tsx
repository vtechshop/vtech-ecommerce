import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, spacing, borderRadius } from '../../theme';

interface GradientHeaderProps {
  colors?: readonly [string, string, ...string[]];
  height?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export default function GradientHeader({
  colors: gradientColors = gradients.primary,
  height = 200,
  children,
  style,
}: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { height }, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
    padding: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
});
