import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);

  if (!isAuthenticated) {
    return (
      <View style={styles.authPrompt}>
        <Ionicons name="person-circle-outline" size={80} color={colors.border} />
        <Text style={styles.authTitle}>Welcome to V-Tech</Text>
        <Text style={styles.authText}>Login or create an account to manage your orders, wishlist, and more.</Text>
        <Button title="Login" onPress={() => router.push('/(auth)/login')} style={{ marginTop: spacing.lg, width: 200 }} />
        <Button title="Create Account" variant="outline" onPress={() => router.push('/(auth)/register')} style={{ marginTop: spacing.sm, width: 200 }} />
      </View>
    );
  }

  const menuItems: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }> = [
    { icon: 'bag-outline', label: 'My Orders', onPress: () => router.push('/orders' as any) },
    { icon: 'location-outline', label: 'Addresses', onPress: () => router.push('/orders/addresses' as any) },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/orders/notifications' as any) },
    { icon: 'star-outline', label: 'Loyalty Points', onPress: () => router.push('/orders/loyalty' as any) },
    { icon: 'chatbubble-outline', label: 'Support Tickets', onPress: () => router.push('/orders/tickets' as any) },
  ];

  // Role-based menu items
  if (user?.role === ROLES.VENDOR || user?.role === ROLES.ADMIN) {
    menuItems.push({ icon: 'storefront-outline', label: 'Vendor Dashboard', onPress: () => router.push('/vendor' as any) });
  }
  if (user?.role === ROLES.AFFILIATE || user?.role === ROLES.ADMIN) {
    menuItems.push({ icon: 'link-outline', label: 'Affiliate Dashboard', onPress: () => router.push('/affiliate' as any) });
  }
  if (user?.role === ROLES.ADMIN) {
    menuItems.push({ icon: 'shield-outline', label: 'Admin Panel', onPress: () => router.push('/admin' as any) });
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.role}>{user?.role}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
            <Ionicons name={item.icon} size={22} color={colors.text} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  authPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  authTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  authText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.white },
  name: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  email: { fontSize: fontSize.sm, color: colors.textSecondary },
  role: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 },
  menu: { marginTop: spacing.md, backgroundColor: colors.white },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  menuLabel: { fontSize: fontSize.md, color: colors.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  logoutText: { fontSize: fontSize.md, color: colors.error, fontWeight: '600' },
});
