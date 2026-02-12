import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vendorApi } from '../../src/api/vendor';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

export default function VendorSettlements() {
  const { isReady } = useAuthGuard([ROLES.VENDOR, ROLES.ADMIN]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await vendorApi.getSettlements();
      setSettlements(data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (!isReady || loading) return <LoadingScreen />;

  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.md }}>
      <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
      <Text style={{ fontSize: fontSize.md, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>{error}</Text>
      <TouchableOpacity onPress={loadData} style={{ marginTop: spacing.md, padding: spacing.sm }}>
        <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: '600' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const statusColors: Record<string, string> = {
    pending: colors.warning, processed: colors.success, failed: colors.error,
  };

  return (
    <FlatList
      style={styles.container}
      data={settlements}
      keyExtractor={(item, i) => item._id || String(i)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="cash-outline" size={80} color={colors.border} />
          <Text style={styles.emptyTitle}>No settlements yet</Text>
          <Text style={styles.emptyText}>Your payouts will appear here</Text>
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
          {item.utr && <Text style={styles.meta}>UTR: {item.utr}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
});
