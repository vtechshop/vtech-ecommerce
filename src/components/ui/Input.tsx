import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, borderRadius, spacing, fontSize, fontWeight, letterSpacing } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

const AnimatedView = Animated.View;

export default function Input({ label, error, leftIcon, isPassword, style, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const focusProgress = useSharedValue(0);
  const errorShake = useSharedValue(0);

  const containerAnimStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? colors.error
      : interpolateColor(focusProgress.value, [0, 1], [colors.border, colors.primary]);
    return {
      borderColor,
      borderWidth: focusProgress.value > 0.5 ? 2 : 1.5,
    };
  });

  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + focusProgress.value * 0.5,
    transform: [{ scale: 1 + focusProgress.value * 0.1 }],
  }));

  const errorAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  const handleFocus = (e: any) => {
    focusProgress.value = withTiming(1, { duration: 200 });
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    focusProgress.value = withTiming(0, { duration: 200 });
    if (error) {
      errorShake.value = withSequence(
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(3, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
    props.onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <AnimatedView style={[
        styles.inputContainer,
        error && styles.inputError,
        containerAnimStyle,
      ]}>
        {leftIcon && (
          <Animated.View style={iconAnimStyle}>
            <Ionicons name={leftIcon} size={20} color={colors.textSecondary} style={styles.leftIcon} />
          </Animated.View>
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isPassword && !showPassword}
          autoCorrect={false}
          spellCheck={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </AnimatedView>
      {error && (
        <Animated.Text style={[styles.error, errorAnimStyle]}>{error}</Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: letterSpacing.wide,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  input: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  leftIcon: { marginLeft: spacing.md },
  eyeIcon: { padding: spacing.md },
  error: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs },
});
