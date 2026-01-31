import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { data } = await adminApi.getDashboardStats();
      setStats(data.data);
    } catch {}
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
          <View key={i} style={styles.statCard}>
            <Ionicons name={stat.icon as any} size={22} color={stat.color} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Management</Text>
      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
            <Ionicons name={item.icon} size={22} color={colors.text} />
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
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.md, marginTop: spacing.lg },
  menu: { backgroundColor: colors.white, marginTop: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  menuLabel: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
});
