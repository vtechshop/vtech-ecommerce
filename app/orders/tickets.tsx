import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../src/api/user';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const PAGE_LIMIT = 20;

const statusColors: Record<string, string> = {
  open: colors.warning, 'in-progress': colors.info, resolved: colors.success, closed: colors.textSecondary,
};

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = async (pageNum: number = 1) => {
    if (pageNum === 1) setError(null);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const { data } = await userApi.getTickets({ page: pageNum, limit: PAGE_LIMIT });
      const items = data.data || [];
      if (pageNum === 1) setTickets(items);
      else setTickets((prev) => [...prev, ...items]);
      setHasMore(items.length >= PAGE_LIMIT);
      setPage(pageNum);
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to load data'); }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = async () => { setRefreshing(true); setHasMore(true); await loadData(1); setRefreshing(false); };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) loadData(page + 1);
  };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill subject and message');
      return;
    }
    setCreating(true);
    try {
      await userApi.createTicket({ subject: subject.trim(), message: message.trim() });
      setShowModal(false);
      setSubject('');
      setMessage('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create ticket');
    }
    setCreating(false);
  };

  if (loading) return <LoadingScreen />;

  if (error && tickets.length === 0) {
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

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item, i) => item._id || String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.footerText}>Loading more...</Text></View>
          ) : null
        }
        ListHeaderComponent={
          <Button title="New Ticket" variant="outline" onPress={() => setShowModal(true)} style={{ marginBottom: spacing.md }}
            icon={<Ionicons name="add" size={18} color={colors.primary} />}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={80} color={colors.border} />
            <Text style={styles.emptyTitle}>No support tickets</Text>
            <Text style={styles.emptyText}>Need help? Create a support ticket</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/orders/ticket/${item._id}` as any)}>
            <View style={styles.cardHeader}>
              <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || colors.textSecondary }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.ticketMessage} numberOfLines={2}>{item.message || item.lastMessage}</Text>
            <Text style={styles.ticketDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Support Ticket</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description of your issue"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your issue in detail..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor={colors.textSecondary}
            />
            <Button title="Submit Ticket" onPress={handleCreate} loading={creating} style={{ marginTop: spacing.lg }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketSubject: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginRight: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
  ticketMessage: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  ticketDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
  modalContainer: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, ...shadows.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  modalContent: { padding: spacing.md },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.white },
  textArea: { minHeight: 120 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.background },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' as const },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  footerText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
