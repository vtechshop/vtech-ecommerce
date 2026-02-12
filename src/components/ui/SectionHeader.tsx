import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, letterSpacing, borderRadius } from '../../theme';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, actionText, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.accent} />
      </View>
      {actionText && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: letterSpacing.tight,
  },
  accent: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  action: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
