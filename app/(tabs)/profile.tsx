import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { userApi } from '../../src/api/user';
import { authApi } from '../../src/api/auth';
import Button from '../../src/components/ui/Button';
import GradientHeader from '../../src/components/ui/GradientHeader';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, gradients } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editSaving, setEditSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Reanimated hooks must be called unconditionally — before any early return
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0], [1.3, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 180], [0, -40], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 140], [1, 0.6], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.authPrompt}>
        <View style={styles.authIconCircle}>
          <Ionicons name="person-circle-outline" size={60} color={colors.primaryLight} />
        </View>
        <Text style={styles.authTitle}>Welcome to V-Tech</Text>
        <Text style={styles.authText}>Login or create an account to manage your orders, wishlist, and more.</Text>
        <Button title="Login" onPress={() => router.push('/(auth)/login')} style={{ marginTop: spacing.lg, width: 200 }} />
        <Button title="Create Account" variant="outline" onPress={() => router.push('/(auth)/register')} style={{ marginTop: spacing.sm, width: 200 }} />
        <View style={styles.guestLinks}>
          {[
            { label: 'About Us', route: '/pages/about' },
            { label: 'Contact Us', route: '/pages/contact' },
            { label: 'Privacy Policy', route: '/pages/privacy-policy' },
            { label: 'Terms of Service', route: '/pages/terms' },
          ].map((item, index) => (
            <TouchableOpacity key={index} onPress={() => router.push(item.route as any)}>
              <Text style={styles.guestLinkText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setEditSaving(true);
    try {
      await userApi.updateProfile({ name: editName.trim(), phone: editPhone.trim() });
      Alert.alert('Success', 'Profile updated');
      setShowEditProfile(false);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update profile');
    }
    setEditSaving(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) { Alert.alert('Error', 'Please fill all fields'); return; }
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to change password');
    }
    setPwSaving(false);
  };

  const menuItems: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color: string; bg: string }> = [
    { icon: 'bag-outline', label: 'My Orders', onPress: () => router.push('/orders' as any), color: '#3B82F6', bg: '#DBEAFE' },
    { icon: 'location-outline', label: 'Addresses', onPress: () => router.push('/orders/addresses' as any), color: '#10B981', bg: '#D1FAE5' },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/orders/notifications' as any), color: '#F59E0B', bg: '#FEF3C7' },
    { icon: 'star-outline', label: 'Loyalty Points', onPress: () => router.push('/orders/loyalty' as any), color: '#8B5CF6', bg: '#EDE9FE' },
    { icon: 'chatbubble-outline', label: 'Support Tickets', onPress: () => router.push('/orders/tickets' as any), color: '#EC4899', bg: '#FCE7F3' },
  ];

  if (user?.role === ROLES.VENDOR || user?.role === ROLES.ADMIN) {
    menuItems.push({ icon: 'storefront-outline', label: 'Vendor Dashboard', onPress: () => router.push('/vendor' as any), color: '#F97316', bg: '#FFEDD5' });
  }
  if (user?.role === ROLES.AFFILIATE || user?.role === ROLES.ADMIN) {
    menuItems.push({ icon: 'link-outline', label: 'Affiliate Dashboard', onPress: () => router.push('/affiliate' as any), color: '#06B6D4', bg: '#CFFAFE' });
  }
  if (user?.role === ROLES.ADMIN) {
    menuItems.push({ icon: 'shield-outline', label: 'Admin Panel', onPress: () => router.push('/admin' as any), color: '#EF4444', bg: '#FEE2E2' });
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };


  return (
    <Animated.ScrollView style={styles.container} onScroll={scrollHandler} scrollEventThrottle={16}>
      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={colors.textSecondary} />
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput style={styles.modalInput} value={editPhone} onChangeText={setEditPhone} placeholder="Phone number" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setShowEditProfile(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={handleSaveProfile} loading={editSaving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} transparent animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput style={styles.modalInput} value={oldPassword} onChangeText={setOldPassword} placeholder="Current password" placeholderTextColor={colors.textSecondary} secureTextEntry />
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput style={styles.modalInput} value={newPassword} onChangeText={setNewPassword} placeholder="New password (min 6 chars)" placeholderTextColor={colors.textSecondary} secureTextEntry />
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput style={styles.modalInput} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={colors.textSecondary} secureTextEntry />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setShowChangePassword(false)} style={{ flex: 1 }} />
              <Button title="Change" onPress={handleChangePassword} loading={pwSaving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Gradient Header with Parallax */}
      <Animated.View style={headerAnimatedStyle}>
        <GradientHeader colors={gradients.primary} height={200}>
          <View style={styles.headerContent}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark" size={10} color={colors.white} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.roleBadgeRow}>
                <View style={styles.roleBadge}>
                  <Ionicons name="ribbon" size={10} color={colors.white} />
                  <Text style={styles.roleText}>{user?.role}</Text>
                </View>
                <View style={styles.memberBadge}>
                  <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.memberText}>Member since {new Date(user?.createdAt || Date.now()).getFullYear()}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => { setEditName(user?.name || ''); setEditPhone(user?.phone || ''); setShowEditProfile(true); }}>
              <Ionicons name="create-outline" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </GradientHeader>
      </Animated.View>

      {/* Account Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => { setEditName(user?.name || ''); setEditPhone(user?.phone || ''); setShowEditProfile(true); }}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>Edit Profile</Text>
        </TouchableOpacity>
        <View style={styles.quickDivider} />
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setShowChangePassword(true); }}>
          <Ionicons name="key-outline" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>Password</Text>
        </TouchableOpacity>
        <View style={styles.quickDivider} />
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/orders' as any)}>
          <Ionicons name="bag-outline" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>Orders</Text>
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]} onPress={item.onPress}>
            <View style={[styles.menuIconCircle, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Info Pages */}
      <View style={styles.menuCard}>
        {[
          { icon: 'newspaper-outline' as keyof typeof Ionicons.glyphMap, label: 'Blog', route: '/pages/blog', color: '#6366F1', bg: '#EEF2FF' },
          { icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap, label: 'About Us', route: '/pages/about', color: '#3B82F6', bg: '#DBEAFE' },
          { icon: 'mail-outline' as keyof typeof Ionicons.glyphMap, label: 'Contact Us', route: '/pages/contact', color: '#10B981', bg: '#D1FAE5' },
          { icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap, label: 'Privacy Policy', route: '/pages/privacy-policy', color: '#8B5CF6', bg: '#EDE9FE' },
          { icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap, label: 'Terms of Service', route: '/pages/terms', color: '#F59E0B', bg: '#FEF3C7' },
          { icon: 'arrow-undo-outline' as keyof typeof Ionicons.glyphMap, label: 'Return Policy', route: '/pages/return-policy', color: '#EF4444', bg: '#FEE2E2' },
        ].map((item, index, arr) => (
          <TouchableOpacity key={index} style={[styles.menuItem, index < arr.length - 1 && styles.menuItemBorder]} onPress={() => router.push(item.route as any)}>
            <View style={[styles.menuIconCircle, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
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

      {/* App Version */}
      <Text style={styles.version}>V-Tech Mobile v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  authPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  authIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  authTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  authText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarRing: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.white },
  avatarBadge: { position: 'absolute', bottom: 0, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white },
  email: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
  roleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  roleText: { fontSize: fontSize.xs, color: colors.white, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  memberText: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: fontWeight.medium },
  editBtn: { padding: spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.full },
  // Quick Actions
  quickActions: { flexDirection: 'row', backgroundColor: colors.white, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.xl, ...shadows.md },
  quickActionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  quickActionText: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.semibold },
  quickDivider: { width: 1, backgroundColor: colors.surfaceDark, marginVertical: spacing.sm },
  // Menu
  menuCard: { marginTop: spacing.md, marginHorizontal: spacing.md, backgroundColor: colors.white, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  menuIconCircle: { width: 36, height: 36, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, margin: spacing.md, backgroundColor: colors.errorLight, borderRadius: borderRadius.xl, gap: spacing.md },
  logoutText: { fontSize: fontSize.md, color: colors.error, fontWeight: fontWeight.semibold },
  version: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textSecondary, paddingBottom: spacing.xl, marginTop: spacing.sm },
  guestLinks: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  guestLinkText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, padding: spacing.lg, ...shadows.xl },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  inputLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: fontSize.md, color: colors.text },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
