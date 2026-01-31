import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { authApi } from '../../src/api/auth';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize } from '../../src/theme';

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
      <View style={styles.container}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>We've sent a password reset link to your email address.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>
      <Controller control={control} name="email" rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
        render={({ field: { onChange, value } }) => (
          <Input label="Email" placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" value={value} onChangeText={onChange} error={errors.email?.message} />
        )}
      />
      <Button title="Send Reset Link" onPress={handleSubmit(onSubmit)} loading={loading} size="lg" style={{ marginTop: spacing.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
});
