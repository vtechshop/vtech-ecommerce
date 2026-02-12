import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../../src/api/orders';
import { Order } from '../../src/types';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { haptic } from '../../src/utils/haptics';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const PAGE_LIMIT = 20;

const statusColors: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', processing: '#8B5CF6',
  shipped: '#06B6D4', delivered: '#10B981', cancelled: '#EF4444', returned: '#6B7280',
};

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const TIME_FILTERS = [
  { label: 'All Time', value: 0 },
  { label: 'Last 30 Days', value: 30 },
  { label: '3 Months', value: 90 },
  { label: '6 Months', value: 180 },
  { label: '1 Year', value: 365 },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState(0);
  const [showTimeFilter, setShowTimeFilter] = useState(false);

  const loadOrders = async (pageNum: number = 1, status?: string) => {
    if (pageNum === 1) setError(null);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const filterStatus = status ?? statusFilter;
      const params: any = { page: pageNum, limit: PAGE_LIMIT };
      if (filterStatus) params.status = filterStatus;
      const { data } = await ordersApi.getAll(params);
      const newOrders = data.data || [];
      if (pageNum === 1) setOrders(newOrders);
      else setOrders((prev) => [...prev, ...newOrders]);
      setHasMore(newOrders.length >= PAGE_LIMIT);
      setPage(pageNum);
    } catch (e: any) { setError(e.response?.data?.message || 'Something went wrong'); }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const onRefresh = async () => { setRefreshing(true); setHasMore(true); await loadOrders(1); setRefreshing(false); };
  const handleLoadMore = () => { if (!loadingMore && hasMore && !loading) loadOrders(page + 1); };

  const changeFilter = (value: string) => {
    setStatusFilter(value);
    setLoading(true);
    setOrders([]);
    setPage(1);
    setHasMore(true);
    loadOrders(1, value);
  };

  // Filter orders by search and time
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) =>
        o.orderId?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.product?.title?.toLowerCase().includes(q))
      );
    }
    if (timeFilter > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - timeFilter);
      result = result.filter((o) => new Date(o.createdAt) >= cutoff);
    }
    return result;
  }, [orders, searchQuery, timeFilter]);

  if (loading && orders.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.timeBtn, showTimeFilter && styles.timeBtnActive]} onPress={() => { haptic.light(); setShowTimeFilter(!showTimeFilter); }}>
          <Ionicons name="calendar-outline" size={16} color={showTimeFilter ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Time Filter */}
      {showTimeFilter && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {TIME_FILTERS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.filterChip, timeFilter === t.value && styles.filterChipActive]}
              onPress={() => { haptic.selection(); setTimeFilter(t.value); }}
            >
              <Text style={[styles.filterChipText, timeFilter === t.value && styles.filterChipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => changeFilter(f.value)}
          >
            <Text style={[styles.filterChipText, statusFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error && orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); loadOrders(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}><Ionicons name="bag-outline" size={40} color={colors.primary} /></View>
          <Text style={styles.emptyTitle}>{statusFilter ? `No ${statusFilter} orders` : 'No orders yet'}</Text>
          <Text style={styles.emptyText}>Your orders will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: spacing.md }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.footerText}>Loading more...</Text></View>
            ) : !hasMore && orders.length > 0 ? (
              <View style={styles.footer}><Text style={styles.footerText}>All orders loaded</Text></View>
            ) : null
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, gap: spacing.sm, ...shadows.sm },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.text, paddingVertical: spacing.sm + 2 },
  timeBtn: { padding: spacing.xs, borderRadius: borderRadius.lg },
  timeBtnActive: { backgroundColor: colors.primaryLightest },
  timeRow: { maxHeight: 44, marginTop: spacing.xs },
  filterRow: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignSelf: 'center' },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadows.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
  date: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  items: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceDark },
  total: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
