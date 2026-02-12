import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { userApi } from '../../src/api/user';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, gradients, letterSpacing } from '../../src/theme';

export default function LoyaltyScreen() {
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [accountRes, txRes] = await Promise.all([
        userApi.getLoyaltyAccount(),
        userApi.getLoyaltyTransactions(),
      ]);
      const account = accountRes.data.data as any;
      setPoints(account?.points ?? account?.balance ?? 0);
      setTransactions(Array.isArray(txRes.data.data) ? txRes.data.data : []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load loyalty data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (loading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      data={transactions}
      keyExtractor={(item, i) => item?._id || String(i)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ flexGrow: 1 }}
      ListHeaderComponent={
        <>
          <View style={styles.pointsCardWrapper}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsCard}
            >
              <Ionicons name="star" size={48} color={colors.white} />
              <Text style={styles.pointsValue}>{(points ?? 0).toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>Loyalty Points</Text>
              <View style={styles.pointsWorthBadge}>
                <Text style={styles.pointsWorth}>Worth ₹{((points ?? 0) / 10).toLocaleString()}</Text>
              </View>
            </LinearGradient>
          </View>

          {error && (
            <TouchableOpacity style={styles.errorBanner} onPress={() => { setLoading(true); loadData(); }}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          )}

          {transactions.length > 0 && (
            <Text style={styles.sectionTitle}>Transaction History</Text>
          )}
        </>
      }
      ListEmptyComponent={
        !error ? (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Shop to earn loyalty points!</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const txType = item?.type || 'earned';
        const txPoints = item?.points ?? item?.amount ?? 0;
        const txDesc = item?.description || item?.reason || txType;
        const txDate = item?.createdAt || item?.date;
        const isEarned = txType === 'earned' || txType === 'credit';

        return (
          <View style={styles.txItem}>
            <View style={[styles.txIcon, { backgroundColor: isEarned ? colors.successLight : colors.errorLight }]}>
              <Ionicons
                name={isEarned ? 'add-circle' : 'remove-circle'}
                size={20}
                color={isEarned ? colors.success : colors.error}
              />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txDesc}>{txDesc}</Text>
              {txDate && (
                <Text style={styles.txDate}>
                  {new Date(txDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </View>
            <Text style={[styles.txPoints, { color: isEarned ? colors.success : colors.error }]}>
              {isEarned ? '+' : '-'}{txPoints}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pointsCardWrapper: { margin: spacing.md, borderRadius: borderRadius.xxl, ...shadows.colored(colors.primary) },
  pointsCard: { borderRadius: borderRadius.xxl, padding: spacing.xl, alignItems: 'center' },
  pointsValue: { fontSize: fontSize.xxxl + 8, fontWeight: fontWeight.extrabold, color: colors.white, marginTop: spacing.sm, letterSpacing: letterSpacing.tight },
  pointsLabel: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  pointsWorthBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginTop: spacing.sm },
  pointsWorth: { fontSize: fontSize.sm, color: colors.white, fontWeight: fontWeight.semibold },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.errorLight, marginHorizontal: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
  errorText: { fontSize: fontSize.sm, color: colors.error, flex: 1 },
  retryText: { fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.bold, textDecorationLine: 'underline' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  emptyTx: { alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  emptySubtext: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  txIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, marginLeft: spacing.md },
  txDesc: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  txDate: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  txPoints: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
});
