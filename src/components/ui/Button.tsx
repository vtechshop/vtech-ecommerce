import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, borderRadius, spacing, fontSize, fontWeight, letterSpacing, shadows } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const gradientMap: Record<string, readonly [string, string, ...string[]]> = {
  primary: gradients.primary,
  secondary: gradients.secondary,
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isGradient = variant in gradientMap;
  const sizeKey = `size_${size}` as keyof typeof styles;
  const textVariantKey = `text_${variant}` as keyof typeof styles;
  const textSizeKey = `textSize_${size}` as keyof typeof styles;

  const content = loading ? (
    <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white} />
  ) : (
    <>
      {icon}
      <Text style={[styles.text, styles[textVariantKey], styles[textSizeKey], textStyle]}>{title}</Text>
    </>
  );

  if (isGradient) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={[
          styles.outerGradient,
          scaleStyle,
          variant === 'primary' && shadows.colored(colors.primary),
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={gradientMap[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, styles[sizeKey] as ViewStyle]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[
        styles.base,
        styles[variant as keyof typeof styles] as ViewStyle,
        styles[sizeKey] as ViewStyle,
        scaleStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  outerGradient: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.error },
  disabled: { opacity: 0.5 },
  size_sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  size_md: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.lg },
  size_lg: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl },
  text: { fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wide },
  text_primary: { color: colors.white },
  text_secondary: { color: colors.white },
  text_outline: { color: colors.primary },
  text_ghost: { color: colors.primary },
  text_danger: { color: colors.white },
  textSize_sm: { fontSize: fontSize.sm },
  textSize_md: { fontSize: fontSize.md },
  textSize_lg: { fontSize: fontSize.lg },
});
