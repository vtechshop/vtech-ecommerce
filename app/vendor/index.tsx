import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vendorApi } from '../../src/api/vendor';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

export default function VendorDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { data } = await vendorApi.getDashboardStats();
      setStats(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <LoadingScreen />;

  const menuItems = [
    { icon: 'cube-outline' as const, label: 'Products', desc: 'Manage your products', route: '/vendor/products' },
    { icon: 'bag-outline' as const, label: 'Orders', desc: 'View & manage orders', route: '/vendor/orders' },
    { icon: 'cash-outline' as const, label: 'Settlements', desc: 'View payouts & earnings', route: '/vendor/settlements' },
    { icon: 'document-outline' as const, label: 'KYC', desc: 'Verify your identity', route: '/vendor/kyc' },
    { icon: 'card-outline' as const, label: 'Razorpay', desc: 'Connect payment account', route: '/vendor/razorpay' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Total Sales', value: `₹${stats?.totalSales?.toLocaleString() || 0}`, icon: 'trending-up', color: colors.success },
          { label: 'Orders', value: stats?.totalOrders || 0, icon: 'bag', color: colors.primary },
          { label: 'Products', value: stats?.totalProducts || 0, icon: 'cube', color: colors.secondary },
          { label: 'Pending', value: stats?.pendingOrders || 0, icon: 'time', color: colors.warning },
        ].map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  statCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  statLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  menu: { backgroundColor: colors.white, marginTop: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1, marginLeft: spacing.md },
  menuLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  menuDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});
