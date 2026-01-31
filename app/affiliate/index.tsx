import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { affiliateApi } from '../../src/api/affiliate';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

export default function AffiliateDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { data } = await affiliateApi.getStats();
      setStats(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <LoadingScreen />;

  const menuItems = [
    { icon: 'link-outline' as const, label: 'My Links', desc: 'Create & manage affiliate links', route: '/affiliate/links' },
    { icon: 'cash-outline' as const, label: 'Commissions', desc: 'View your earnings', route: '/affiliate/commissions' },
    { icon: 'wallet-outline' as const, label: 'Payouts', desc: 'Request & track payouts', route: '/affiliate/payouts' },
    { icon: 'document-outline' as const, label: 'KYC', desc: 'Verify your identity', route: '/affiliate/kyc' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.statsGrid}>
        {[
          { label: 'Clicks', value: stats?.clicks || 0, icon: 'eye', color: colors.info },
          { label: 'Conversions', value: stats?.conversions || 0, icon: 'checkmark-circle', color: colors.success },
          { label: 'Earnings', value: `₹${stats?.earnings?.toLocaleString() || 0}`, icon: 'cash', color: colors.primary },
        ].map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

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
  statsGrid: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  menu: { backgroundColor: colors.white, marginTop: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1, marginLeft: spacing.md },
  menuLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  menuDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});
