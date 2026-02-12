import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import { Affiliate } from '../../src/types';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const kycColors: Record<string, string> = {
  pending: colors.warning, submitted: colors.info, approved: colors.success, rejected: colors.error,
};

export default function AdminAffiliates() {
  const { isReady } = useAuthGuard([ROLES.ADMIN]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await adminApi.getAffiliates();
      setAffiliates(data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleApprove = (id: string) => {
    Alert.alert('Approve Affiliate', 'Approve this affiliate?', [
      { text: 'Cancel' },
      {
        text: 'Approve', onPress: async () => {
          try {
            await adminApi.approveAffiliate(id);
            loadData();
          } catch {
            Alert.alert('Error', 'Failed to approve affiliate');
          }
        },
      },
    ]);
  };

  const handleReject = (id: string) => {
    Alert.alert('Reject Affiliate', 'Reject this affiliate?', [
      { text: 'Cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            await adminApi.rejectAffiliate(id, 'Rejected by admin');
            loadData();
          } catch {
            Alert.alert('Error', 'Failed to reject affiliate');
          }
        },
      },
    ]);
  };

  if (!isReady || loading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      data={affiliates}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="link-outline" size={60} color={colors.border} />
          <Text style={styles.emptyText}>No affiliates found</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.affIcon}>
              <Ionicons name="link" size={20} color={'#EC4899'} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.affCode}>Code: {item.code}</Text>
              <View style={[styles.kycBadge, { backgroundColor: (kycColors[item.kycStatus] || colors.textSecondary) + '20' }]}>
                <Text style={[styles.kycText, { color: kycColors[item.kycStatus] || colors.textSecondary }]}>
                  KYC: {item.kycStatus}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats?.clicks || 0}</Text>
              <Text style={styles.statLabel}>Clicks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats?.conversions || 0}</Text>
              <Text style={styles.statLabel}>Conversions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{(item.stats?.earnings || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
          </View>

          {(item.kycStatus === 'submitted' || item.kycStatus === 'pending') && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item._id)}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item._id)}>
                <Ionicons name="close" size={16} color={colors.error} />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  affIcon: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: '#EC489920', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  affCode: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  kycBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginTop: spacing.xs },
  kycText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  approveBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.error, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  rejectBtnText: { color: colors.error, fontWeight: '600', fontSize: fontSize.sm },
});
