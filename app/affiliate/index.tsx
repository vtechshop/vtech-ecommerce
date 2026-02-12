import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { affiliateApi } from '../../src/api/affiliate';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing } from '../../src/theme';

export default function AffiliateDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await affiliateApi.getDashboardStats();
      setStats(data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <LoadingScreen />;

  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
      <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
      <Text style={{ fontSize: fontSize.md, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>{error}</Text>
      <TouchableOpacity onPress={loadData} style={{ marginTop: spacing.md, padding: spacing.sm }}>
        <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '600' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

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
          { label: 'Earnings', value: `₹${(stats?.earnings ?? 0).toLocaleString()}`, icon: 'cash', color: colors.primary },
        ].map((stat, i) => (
          <View key={i} style={[styles.statCard, { borderLeftColor: stat.color }]}>
            <View style={[styles.statIconCircle, { backgroundColor: stat.color + '15' }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuItem, i === menuItems.length - 1 && styles.menuItemLast]} onPress={() => router.push(item.route as any)}>
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
    borderRadius: borderRadius.xl,
    padding: spacing.md,
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
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, letterSpacing: letterSpacing.tight, color: colors.text, marginTop: spacing.sm },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    ...shadows.sm,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { width: 36, height: 36, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1, marginLeft: spacing.md },
  menuLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  menuDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});
