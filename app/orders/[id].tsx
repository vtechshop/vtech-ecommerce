import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../../src/api/orders';
import { useAppDispatch } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';
import { Order } from '../../src/types';
import StatusTimeline from '../../src/components/order/StatusTimeline';
import RateReviewModal from '../../src/components/order/RateReviewModal';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing } from '../../src/theme';

const statusColors: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', processing: '#8B5CF6',
  shipped: '#06B6D4', delivered: '#10B981', cancelled: '#EF4444', returned: '#6B7280',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<{ productId: string; title: string } | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const { data } = await ordersApi.getById(id);
      setOrder(data.data);
    } catch (e: any) { setError(e.response?.data?.message || 'Something went wrong'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          setCancelling(true);
          try {
            await ordersApi.cancel(id, 'Cancelled by customer');
            loadData();
          } catch { Alert.alert('Error', 'Failed to cancel order'); }
          setCancelling(false);
        },
      },
    ]);
  };

  const handleTrack = async () => {
    try {
      const { data } = await ordersApi.trackOrder(id);
      const tracking = data.data;
      Alert.alert('Tracking Info', `Status: ${tracking.status}\n${JSON.stringify(tracking.tracking || {}, null, 2)}`);
    } catch { Alert.alert('Error', 'Tracking information not available'); }
  };

  const handleReorder = async () => {
    if (!order) return;
    let added = 0;
    for (const item of order.items) {
      if (item.product?._id) {
        try {
          await dispatch(addToCart({ productId: item.product._id, quantity: item.quantity }));
          added++;
        } catch {}
      }
    }
    if (added > 0) {
      Alert.alert('Reorder', `${added} item${added > 1 ? 's' : ''} added to cart`, [
        { text: 'Continue Shopping' },
        { text: 'Go to Cart', onPress: () => router.push('/(tabs)/cart') },
      ]);
    } else {
      Alert.alert('Error', 'Could not add items to cart');
    }
  };

  const getDeliveryEstimate = () => {
    if (!order) return '';
    const created = new Date(order.createdAt);
    created.setDate(created.getDate() + 7);
    return created.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading) return <LoadingScreen />;
  if (!order) return <LoadingScreen message="Order not found" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Order Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.orderId}>#{order.orderId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[order.status] || colors.textSecondary }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          <Text style={styles.date}>
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          {['pending', 'confirmed', 'processing', 'shipped'].includes(order.status) && (
            <View style={styles.deliveryEstimate}>
              <Ionicons name="car-outline" size={14} color={colors.info} />
              <Text style={styles.deliveryText}>Estimated delivery: {getDeliveryEstimate()}</Text>
            </View>
          )}
        </View>

        {/* Status Timeline */}
        <View>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.accentBar} />
        </View>
        <View style={styles.card}>
          <StatusTimeline status={order.status} createdAt={order.createdAt} />
        </View>

        {/* Items */}
        <View>
          <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          <View style={styles.accentBar} />
        </View>
        <View style={styles.card}>
          {(order.items || []).map((item, i) => (
            <View key={i} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
              {item.product?.images?.[0] ? (
                <TouchableOpacity onPress={() => router.push(`/product/${item.product?._id}`)}>
                  <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.itemImage, styles.imagePlaceholder]}>
                  <Ionicons name="image-outline" size={20} color={colors.border} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={2}>{item.product?.title || 'Product'}</Text>
                <Text style={styles.itemMeta}>Qty: {item.quantity ?? 0} | ₹{(item.price ?? 0).toLocaleString()}</Text>
                {/* Rate button for delivered orders */}
                {order.status === 'delivered' && item.product?._id && (
                  <TouchableOpacity
                    style={styles.rateBtn}
                    onPress={() => setReviewItem({ productId: item.product._id, title: item.product?.title || 'Product' })}
                  >
                    <Ionicons name="star-outline" size={14} color={colors.secondary} />
                    <Text style={styles.rateBtnText}>Rate & Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.accentBar} />
        </View>
        <View style={styles.card}>
          <Text style={styles.addressName}>{order.shipTo?.fullName || 'N/A'}</Text>
          <Text style={styles.addressLine}>{order.shipTo?.addressLine1}{order.shipTo?.addressLine2 ? `, ${order.shipTo.addressLine2}` : ''}</Text>
          <Text style={styles.addressLine}>{order.shipTo?.city}, {order.shipTo?.state} - {order.shipTo?.pincode}</Text>
          <Text style={styles.addressLine}>{order.shipTo?.phone}</Text>
        </View>

        {/* Payment & Totals */}
        <View>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.accentBar} />
        </View>
        <View style={styles.card}>
          <View style={styles.summaryRow}><Text style={styles.label}>Payment Method</Text><Text style={styles.value}>{order.payment?.method || 'N/A'}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>₹{(order.totals?.subtotal ?? 0).toLocaleString()}</Text></View>
          {(order.totals?.discount ?? 0) > 0 && <View style={styles.summaryRow}><Text style={styles.label}>Discount</Text><Text style={[styles.value, { color: colors.success }]}>-₹{(order.totals?.discount ?? 0).toLocaleString()}</Text></View>}
          <View style={styles.summaryRow}><Text style={styles.label}>Tax</Text><Text style={styles.value}>₹{(order.totals?.tax ?? 0).toLocaleString()}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.label}>Shipping</Text><Text style={styles.value}>₹{(order.totals?.shipping ?? 0).toLocaleString()}</Text></View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{(order.totals?.total ?? 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {order.status === 'shipped' && (
            <Button title="Track Order" variant="outline" onPress={handleTrack} style={{ flex: 1 }} />
          )}
          {['pending', 'confirmed'].includes(order.status) && (
            <Button title="Cancel Order" variant="danger" onPress={handleCancel} loading={cancelling} style={{ flex: 1 }} />
          )}
          {order.status === 'delivered' && (
            <Button title="Reorder" variant="outline" onPress={handleReorder} style={{ flex: 1 }} />
          )}
        </View>
      </ScrollView>

      {/* Rate & Review Modal */}
      {reviewItem && (
        <RateReviewModal
          visible={!!reviewItem}
          onClose={() => setReviewItem(null)}
          productId={reviewItem.productId}
          productTitle={reviewItem.title}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusText: { color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
  date: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  deliveryEstimate: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, backgroundColor: colors.infoLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  deliveryText: { fontSize: fontSize.xs, color: colors.info, fontWeight: fontWeight.semibold },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  accentBar: { width: 24, height: 3, backgroundColor: colors.primary, borderRadius: 2, marginTop: 4, marginBottom: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemImage: { width: 56, height: 56, borderRadius: borderRadius.md },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  itemMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  rateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, backgroundColor: colors.secondaryLighter, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  rateBtnText: { fontSize: fontSize.xs, color: colors.secondary, fontWeight: fontWeight.semibold },
  addressName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  addressLine: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { fontSize: fontSize.md, color: colors.textSecondary },
  value: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  totalLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.text, letterSpacing: letterSpacing.tight },
  totalValue: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.primary, letterSpacing: letterSpacing.tight },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
