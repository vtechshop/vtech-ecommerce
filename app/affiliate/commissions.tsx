import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { affiliateApi } from '../../src/api/affiliate';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const STATUS_TABS = ['all', 'pending', 'approved', 'paid', 'rejected'];
const statusColors: Record<string, string> = {
  pending: colors.warning, approved: colors.info, paid: colors.success, rejected: colors.error,
};

export default function AffiliateCommissions() {
  const { isReady } = useAuthGuard([ROLES.AFFILIATE, ROLES.ADMIN]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const loadData = async (status?: string) => {
    setError(null);
    try {
      const params = status && status !== 'all' ? { status } : undefined;
      const { data } = await affiliateApi.getCommissions(params);
      setCommissions(data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(activeTab); }, [isReady, activeTab]);
  const onRefresh = async () => { setRefreshing(true); await loadData(activeTab); setRefreshing(false); };

  if (!isReady || loading) return <LoadingScreen />;

  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md }}>
      <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
      <Text style={{ fontSize: fontSize.md, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>{error}</Text>
      <TouchableOpacity onPress={() => loadData(activeTab)} style={{ marginTop: spacing.md, padding: spacing.sm }}>
        <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '600' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === item && styles.tabActive]}
            onPress={() => { setLoading(true); setActiveTab(item); }}
          >
            <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={commissions}
        keyExtractor={(item, i) => item._id || String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cash-outline" size={60} color={colors.border} />
            <Text style={styles.emptyText}>No commissions found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.amount}>₹{(item.amount || 0).toLocaleString()}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || colors.textSecondary }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            {item.orderId && <Text style={styles.meta}>Order: #{item.orderId}</Text>}
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.white },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
});
