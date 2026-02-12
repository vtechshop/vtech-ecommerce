import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { affiliateApi } from '../../src/api/affiliate';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const statusColors: Record<string, string> = {
  pending: colors.warning, processed: colors.success, failed: colors.error,
};

export default function AffiliatePayouts() {
  const { isReady } = useAuthGuard([ROLES.AFFILIATE, ROLES.ADMIN]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [amount, setAmount] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await affiliateApi.getPayouts();
      setPayouts(data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleRequestPayout = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setRequesting(true);
    try {
      await affiliateApi.requestPayout(numAmount);
      Alert.alert('Success', 'Payout request submitted');
      setAmount('');
      setShowRequest(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to request payout');
    }
    setRequesting(false);
  };

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

  return (
    <View style={styles.container}>
      <FlatList
        data={payouts}
        keyExtractor={(item, i) => item._id || String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            {showRequest ? (
              <View style={styles.requestCard}>
                <Text style={styles.requestTitle}>Request Payout</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount (₹)"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.requestBtns}>
                  <Button title="Cancel" variant="outline" onPress={() => setShowRequest(false)} size="sm" style={{ flex: 1 }} />
                  <Button title="Submit" onPress={handleRequestPayout} loading={requesting} size="sm" style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Button title="Request Payout" onPress={() => setShowRequest(true)} variant="outline" />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={80} color={colors.border} />
            <Text style={styles.emptyTitle}>No payouts yet</Text>
            <Text style={styles.emptyText}>Your payout history will appear here</Text>
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
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            {item.utr && <Text style={styles.meta}>UTR: {item.utr}</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  requestCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md },
  requestTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.md },
  requestBtns: { flexDirection: 'row', gap: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
});
