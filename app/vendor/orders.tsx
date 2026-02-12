import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vendorApi } from '../../src/api/vendor';
import { Order } from '../../src/types';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const PAGE_LIMIT = 20;

const statusColors: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', processing: '#8B5CF6',
  shipped: '#06B6D4', delivered: '#10B981', cancelled: '#EF4444', returned: '#6B7280',
};

const STATUS_TABS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function VendorOrders() {
  const { isReady } = useAuthGuard([ROLES.VENDOR, ROLES.ADMIN]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = async (status?: string, pageNum: number = 1) => {
    if (pageNum === 1) setError(null);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const params: any = { page: pageNum, limit: PAGE_LIMIT };
      if (status && status !== 'all') params.status = status;
      const { data } = await vendorApi.getOrders(params);
      const items = data.data || [];
      if (pageNum === 1) setOrders(items);
      else setOrders((prev) => [...prev, ...items]);
      setHasMore(items.length >= PAGE_LIMIT);
      setPage(pageNum);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load data');
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { if (isReady) { setPage(1); setHasMore(true); loadData(activeTab); } }, [isReady, activeTab]);

  const onRefresh = async () => { setRefreshing(true); setHasMore(true); await loadData(activeTab, 1); setRefreshing(false); };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) loadData(activeTab, page + 1);
  };

  const handleUpdateStatus = (orderId: string, currentStatus: string) => {
    const nextStatus: Record<string, string> = {
      pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered',
    };
    const next = nextStatus[currentStatus];
    if (!next) return;

    Alert.alert('Update Status', `Move order to "${next}"?`, [
      { text: 'Cancel' },
      {
        text: 'Update', onPress: async () => {
          try {
            await vendorApi.updateOrderStatus(orderId, next);
            loadData(activeTab);
          } catch {
            Alert.alert('Error', 'Failed to update status');
          }
        },
      },
    ]);
  };

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
            onPress={() => { setLoading(true); setPage(1); setHasMore(true); setActiveTab(item); }}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.footerText}>Loading more...</Text></View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={60} color={colors.border} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
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
              {['pending', 'confirmed', 'processing', 'shipped'].includes(item.status) && (
                <TouchableOpacity style={styles.updateBtn} onPress={() => handleUpdateStatus(item._id, item.status)}>
                  <Text style={styles.updateBtnText}>Update Status</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
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
  orderId: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  date: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  items: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  total: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  updateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updateBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
