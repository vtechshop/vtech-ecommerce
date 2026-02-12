import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing } from '../../src/theme';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await adminApi.getDashboardStats();
      setStats(data.data);
    } catch (e: any) { setError(e.response?.data?.message || 'Something went wrong'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <LoadingScreen />;

  const statsCards = [
    { label: 'Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: 'trending-up', color: colors.success },
    { label: 'Orders', value: stats?.totalOrders || 0, icon: 'bag', color: colors.primary },
    { label: 'Users', value: stats?.totalUsers || 0, icon: 'people', color: colors.info },
    { label: 'Products', value: stats?.totalProducts || 0, icon: 'cube', color: colors.secondary },
    { label: 'Vendors', value: stats?.totalVendors || 0, icon: 'storefront', color: '#8B5CF6' },
    { label: 'Affiliates', value: stats?.totalAffiliates || 0, icon: 'link', color: '#EC4899' },
  ];

  const menuItems = [
    { icon: 'people-outline' as const, label: 'Users', route: '/admin/users' },
    { icon: 'cube-outline' as const, label: 'Products', route: '/admin/products' },
    { icon: 'bag-outline' as const, label: 'Orders', route: '/admin/orders' },
    { icon: 'storefront-outline' as const, label: 'Vendors', route: '/admin/vendors' },
    { icon: 'link-outline' as const, label: 'Affiliates', route: '/admin/affiliates' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.statsGrid}>
        {statsCards.map((stat, i) => (
          <View key={i} style={[styles.statCard, { borderLeftColor: stat.color }]}>
            <View style={[styles.statIconCircle, { backgroundColor: stat.color + '15' }]}>
              <Ionicons name={stat.icon as any} size={22} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.accentBar} />
      </View>

      <View style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuItem, i === menuItems.length - 1 && styles.menuItemLast]} onPress={() => router.push(item.route as any)}>
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.sm },
  statCard: {
    width: '31%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    borderLeftWidth: 4,
    ...shadows.md,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, letterSpacing: letterSpacing.tight, color: colors.text, marginTop: spacing.xs },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  sectionTitleWrap: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  accentBar: { width: 24, height: 3, backgroundColor: colors.primary, borderRadius: 2, marginTop: 4 },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark, gap: spacing.md },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { width: 36, height: 36, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
});
