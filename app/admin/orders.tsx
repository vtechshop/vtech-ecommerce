import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import { Order } from '../../src/types';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const statusColors: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', processing: '#8B5CF6',
  shipped: '#06B6D4', delivered: '#10B981', cancelled: '#EF4444', returned: '#6B7280',
};

const STATUS_TABS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const { isReady } = useAuthGuard([ROLES.ADMIN]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const loadData = async (status?: string) => {
    setError(null);
    try {
      const params = status && status !== 'all' ? { status } : undefined;
      const { data } = await adminApi.getOrders(params);
      setOrders(data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(activeTab); }, [isReady, activeTab]);
  const onRefresh = async () => { setRefreshing(true); await loadData(activeTab); setRefreshing(false); };

  if (!isReady || loading) return <LoadingScreen />;

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
        data={orders}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={60} color={colors.border} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/orders/${item._id}` as any)}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>#{item.orderId}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || colors.textSecondary }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Text style={styles.items}>{item.items?.length ?? 0} item(s)</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.total}>₹{(item.totals?.total ?? 0).toLocaleString()}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
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
  orderId: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  date: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  items: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  total: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
});
