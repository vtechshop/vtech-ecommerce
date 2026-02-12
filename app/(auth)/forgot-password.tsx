import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { authApi } from '../../src/api/auth';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import GradientHeader from '../../src/components/ui/GradientHeader';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing, gradients } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<{ email: string }>();

  const onSubmit = async ({ email }: { email: string }) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <GradientHeader height={180}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.white} />
          <Text style={styles.headerTitle}>Reset Password</Text>
        </GradientHeader>

        <View style={styles.card}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successSubtitle}>
            We've sent a password reset link to your email address.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <GradientHeader height={180}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.white} />
        <Text style={styles.headerTitle}>Reset Password</Text>
      </GradientHeader>

      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

        <Controller control={control} name="email" rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
          render={({ field: { onChange, value } }) => (
            <Input label="Email" placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" value={value} onChangeText={onChange} error={errors.email?.message} />
          )}
        />
        <Button title="Send Reset Link" onPress={handleSubmit(onSubmit)} loading={loading} size="lg" style={{ marginTop: spacing.md }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    letterSpacing: letterSpacing.tight,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    marginTop: -spacing.xl,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    ...shadows.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: letterSpacing.tight,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: letterSpacing.tight,
  },
  successSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 22,
  },
});
