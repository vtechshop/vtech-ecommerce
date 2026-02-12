import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../src/api/admin';
import { Vendor } from '../../src/types';
import { useAuthGuard } from '../../src/hooks/useAuthGuard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { ROLES } from '../../src/utils/constants';

const kycColors: Record<string, string> = {
  pending: colors.warning, submitted: colors.info, approved: colors.success, rejected: colors.error,
};

export default function AdminVendors() {
  const { isReady } = useAuthGuard([ROLES.ADMIN]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await adminApi.getVendors();
      setVendors(data.data || []);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to load data'); }
    setLoading(false);
  };

  useEffect(() => { if (isReady) loadData(); }, [isReady]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleApprove = (id: string, name: string) => {
    Alert.alert('Approve Vendor', `Approve "${name}"?`, [
      { text: 'Cancel' },
      {
        text: 'Approve', onPress: async () => {
          try {
            await adminApi.approveVendor(id);
            loadData();
          } catch {
            Alert.alert('Error', 'Failed to approve vendor');
          }
        },
      },
    ]);
  };

  const handleReject = (id: string, name: string) => {
    Alert.alert('Reject Vendor', `Reject "${name}"? This cannot be undone.`, [
      { text: 'Cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            await adminApi.rejectVendor(id, 'Rejected by admin');
            loadData();
          } catch {
            Alert.alert('Error', 'Failed to reject vendor');
          }
        },
      },
    ]);
  };

  if (!isReady || loading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      data={vendors}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="storefront-outline" size={60} color={colors.border} />
          <Text style={styles.emptyText}>No vendors found</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.vendorIcon}>
              <Ionicons name="storefront" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.vendorName}>{item.storeName}</Text>
              <View style={[styles.kycBadge, { backgroundColor: (kycColors[item.kycStatus] || colors.textSecondary) + '20' }]}>
                <Text style={[styles.kycText, { color: kycColors[item.kycStatus] || colors.textSecondary }]}>
                  KYC: {item.kycStatus}
                </Text>
              </View>
            </View>
          </View>
          {item.description && <Text style={styles.vendorDesc} numberOfLines={2}>{item.description}</Text>}
          <Text style={styles.vendorMeta}>Commission: {item.commissionRate}%</Text>

          {(item.kycStatus === 'submitted' || item.kycStatus === 'pending') && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item._id, item.storeName)}>
                <Ionicons name="checkmark" size={16} color={colors.white} />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item._id, item.storeName)}>
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
  vendorIcon: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.md },
  vendorName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  kycBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginTop: spacing.xs },
  kycText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  vendorDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  vendorMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  approveBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.error, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  rejectBtnText: { color: colors.error, fontWeight: '600', fontSize: fontSize.sm },
});
