import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize, fontWeight } from '../../theme';

type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: colors.primaryLightest, text: colors.primary },
  success: { bg: colors.successLight, text: colors.success },
  error: { bg: colors.errorLight, text: colors.error },
  warning: { bg: colors.warningLight, text: colors.warning },
  info: { bg: colors.infoLight, text: colors.info },
  neutral: { bg: colors.surfaceDark, text: colors.textSecondary },
};

export default function Badge({ text, variant = 'primary', size = 'sm' }: BadgeProps) {
  const vc = variantColors[variant];
  return (
    <View style={[styles.base, size === 'md' && styles.md, { backgroundColor: vc.bg }]}>
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: vc.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  md: {
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'capitalize',
  },
  textMd: {
    fontSize: fontSize.sm,
  },
});
