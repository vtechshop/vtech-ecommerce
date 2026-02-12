import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontSize, fontWeight, letterSpacing, spacing } from '../../theme';

export default function LoadingScreen({ message }: { message?: string }) {
  return (
    <LinearGradient
      colors={[colors.primaryLightest, colors.white]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View style={styles.spinnerCircle}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      {message && <Text style={styles.text}>{message}</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  spinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
  },
});
