import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../src/api/user';
import { Notification } from '../../src/types';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const PAGE_LIMIT = 20;

const typeIcons: Record<string, string> = {
  order: 'bag', payment: 'card', shipping: 'airplane', promo: 'gift', system: 'information-circle',
};

const CATEGORY_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Orders', value: 'order' },
  { label: 'Payments', value: 'payment' },
  { label: 'Shipping', value: 'shipping' },
  { label: 'Promos', value: 'promo' },
  { label: 'System', value: 'system' },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadData = async (pageNum: number = 1) => {
    if (pageNum === 1) setError(null);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const { data } = await userApi.getNotifications({ page: pageNum, limit: PAGE_LIMIT });
      const items = data.data || [];
      if (pageNum === 1) setNotifications(items);
      else setNotifications((prev) => [...prev, ...items]);
      setHasMore(items.length >= PAGE_LIMIT);
      setPage(pageNum);
    } catch (e: any) { setError(e.response?.data?.message || 'Something went wrong'); }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); setHasMore(true); await loadData(1); setRefreshing(false); };
  const handleLoadMore = () => { if (!loadingMore && hasMore && !loading) loadData(page + 1); };

  const handleMarkRead = async (id: string) => {
    try {
      await userApi.markNotificationsRead([id]);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    } catch { Alert.alert('Error', 'Failed to mark as read'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await userApi.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { Alert.alert('Error', 'Failed to mark all as read'); }
  };

  const handleNotificationPress = (item: Notification) => {
    if (!item.read) handleMarkRead(item._id);
    // Navigate based on type
    if (item.type === 'order') {
      router.push('/orders' as any);
    } else if (item.type === 'payment') {
      router.push('/orders' as any);
    } else if (item.type === 'shipping') {
      router.push('/orders' as any);
    } else if (item.type === 'promo') {
      router.push('/(tabs)' as any);
    }
  };

  const filteredNotifications = categoryFilter
    ? notifications.filter((n) => n.type === categoryFilter)
    : notifications;

  if (loading) return <LoadingScreen />;

  if (error && notifications.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); loadData(); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {CATEGORY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, categoryFilter === f.value && styles.filterChipActive]}
            onPress={() => setCategoryFilter(f.value)}
          >
            <Text style={[styles.filterChipText, categoryFilter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ flexGrow: 1 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.footerText}>Loading more...</Text></View>
          ) : null
        }
        ListHeaderComponent={
          unreadCount > 0 ? (
            <View style={styles.headerBar}>
              <Text style={styles.unreadCount}>{unreadCount} unread</Text>
              <TouchableOpacity onPress={handleMarkAllRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={80} color={colors.border} />
            <Text style={styles.emptyTitle}>{categoryFilter ? 'No notifications in this category' : 'No notifications'}</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifItem, !item.read && styles.notifUnread]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.notifIcon, !item.read && styles.notifIconUnread]}>
              <Ionicons name={(typeIcons[item.type] || 'notifications') as any} size={20} color={!item.read ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.notifContent}>
              <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>{item.title}</Text>
              <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
              <Text style={styles.notifTime}>
                {new Date(item.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: spacing.xs }} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignSelf: 'center' },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.white, ...shadows.sm },
  unreadCount: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  markAllText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  notifItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  notifUnread: { backgroundColor: colors.primaryLightest },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  notifIconUnread: { backgroundColor: colors.primaryLighter },
  notifContent: { flex: 1, marginLeft: spacing.md },
  notifTitle: { fontSize: fontSize.md, color: colors.text },
  notifTitleUnread: { fontWeight: fontWeight.bold },
  notifMessage: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  notifTime: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.background },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' as const },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
