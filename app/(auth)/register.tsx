import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { register, clearError } from '../../src/store/slices/authSlice';
import Input from '../../src/components/ui/Input';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize } from '../../src/theme';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join V-Tech today</Text>

      <Controller control={control} name="name" rules={{ required: 'Name is required' }}
        render={({ field: { onChange, value } }) => (
          <Input label="Full Name" placeholder="John Doe" leftIcon="person-outline" value={value} onChangeText={onChange} error={errors.name?.message} />
        )}
      />
      <Controller control={control} name="email" rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
        render={({ field: { onChange, value } }) => (
          <Input label="Email" placeholder="your@email.com" keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" value={value} onChangeText={onChange} error={errors.email?.message} />
        )}
      />
      <Controller control={control} name="phone" rules={{ pattern: { value: /^[0-9]{10}$/, message: 'Invalid phone' } }}
        render={({ field: { onChange, value } }) => (
          <Input label="Phone (Optional)" placeholder="9876543210" keyboardType="phone-pad" leftIcon="call-outline" value={value} onChangeText={onChange} error={errors.phone?.message} />
        )}
      />
      <Controller control={control} name="password" rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }}
        render={({ field: { onChange, value } }) => (
          <Input label="Password" placeholder="Min 8 characters" isPassword leftIcon="lock-closed-outline" value={value} onChangeText={onChange} error={errors.password?.message} />
        )}
      />
      <Controller control={control} name="confirmPassword" rules={{ required: 'Confirm password', validate: (v) => v === watch('password') || 'Passwords do not match' }}
        render={({ field: { onChange, value } }) => (
          <Input label="Confirm Password" placeholder="Re-enter password" isPassword leftIcon="lock-closed-outline" value={value} onChangeText={onChange} error={errors.confirmPassword?.message} />
        )}
      />

      <Button title="Create Account" onPress={handleSubmit(onSubmit)} loading={isLoading} size="lg" style={{ marginTop: spacing.lg }} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.footerLink}>Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl },
  footerText: { fontSize: fontSize.md, color: colors.textSecondary },
  footerLink: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
});
