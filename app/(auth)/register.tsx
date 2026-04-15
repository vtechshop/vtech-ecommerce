import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { register, clearError } from '../../src/store/slices/authSlice';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import GradientHeader from '../../src/components/ui/GradientHeader';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing, gradients } from '../../src/theme';

interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterScreen() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);
  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    const result = await dispatch(register({ name: data.name, email: data.email, password: data.password, phone: data.phone }));
    if (register.fulfilled.match(result)) {
      router.replace('/(tabs)');
    }
  };

  React.useEffect(() => {
    if (error) {
      Alert.alert('Registration Failed', error);
      dispatch(clearError());
    }
  }, [error]);

  return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <GradientHeader height={180} style={{ paddingBottom: spacing.xxl }}>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join V-Tech today</Text>
        </GradientHeader>

        <View style={styles.card}>
          <Controller control={control} name="name" rules={{ required: 'Name is required' }}
            render={({ field: { onChange, value } }) => (
              <Input label="Full Name" placeholder="" leftIcon="person-outline" value={value} onChangeText={onChange} error={errors.name?.message} />
            )}
          />
          <Controller control={control} name="email" rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
            render={({ field: { onChange, value } }) => (
              <Input label="Email" placeholder="" keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" value={value} onChangeText={onChange} error={errors.email?.message} />
            )}
          />
          <Controller control={control} name="phone" rules={{ pattern: { value: /^[0-9]{10}$/, message: 'Invalid phone' } }}
            render={({ field: { onChange, value } }) => (
              <Input label="Phone (Optional)" placeholder="" keyboardType="phone-pad" leftIcon="call-outline" value={value} onChangeText={onChange} error={errors.phone?.message} />
            )}
          />
          <Controller control={control} name="password" rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }}
            render={({ field: { onChange, value } }) => (
              <Input label="Password" placeholder="" isPassword leftIcon="lock-closed-outline" value={value} onChangeText={onChange} error={errors.password?.message} />
            )}
          />
          <Controller control={control} name="confirmPassword" rules={{ required: 'Confirm password', validate: (v) => v === watch('password') || 'Passwords do not match' }}
            render={({ field: { onChange, value } }) => (
              <Input label="Confirm Password" placeholder="" isPassword leftIcon="lock-closed-outline" value={value} onChangeText={onChange} error={errors.confirmPassword?.message} />
            )}
          />

          <Button title="Create Account" onPress={handleSubmit(onSubmit)} loading={isLoading} size="lg" style={{ marginTop: spacing.lg }} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustRow}>
          {[
            { icon: 'shield-checkmark-outline' as const, label: 'Secure' },
            { icon: 'lock-closed-outline' as const, label: 'Encrypted' },
            { icon: 'finger-print-outline' as const, label: 'Privacy' },
          ].map((item, i) => (
            <View key={i} style={styles.trustItem}>
              <Ionicons name={item.icon} size={16} color={colors.success} />
              <Text style={styles.trustLabel}>{item.label}</Text>
            </View>
          ))}
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
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    marginTop: -spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    ...shadows.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
