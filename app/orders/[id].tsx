import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert, Image, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ordersApi } from '../../src/api/orders';
import { useAppDispatch } from '../../src/store';
import { addToCart } from '../../src/store/slices/cartSlice';
import { Order } from '../../src/types';
import { amountToWords } from '../../src/utils/numberToWords';
import StatusTimeline from '../../src/components/order/StatusTimeline';
import RateReviewModal from '../../src/components/order/RateReviewModal';
import TrackingMap from '../../src/components/order/TrackingMap';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import Button from '../../src/components/ui/Button';
import { useToast } from '../../src/components/ui/Toast';
import { haptic } from '../../src/utils/haptics';
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
      const t = tracking.tracking ?? {} as typeof tracking.tracking;
      const trackingDetails = [
        `Status: ${tracking.status}`,
        t.provider ? `Carrier: ${t.provider}` : '',
        t.trackingId ? `Tracking ID: ${t.trackingId}` : '',
        t.url ? `Track at: ${t.url}` : '',
        t.estimatedDelivery ? `Est. Delivery: ${t.estimatedDelivery}` : '',
      ].filter(Boolean).join('\n');
      Alert.alert('Tracking Info', trackingDetails);
    } catch { Alert.alert('Error', 'Tracking information not available'); }
  };

  const { showToast } = useToast();

  const handleReorder = async () => {
    if (!order) return;
    haptic.medium();
    let added = 0;
    for (const item of (order.items || [])) {
      if (item.product?._id) {
        try {
          await dispatch(addToCart({ productId: item.product._id, quantity: item.quantity }));
          added++;
        } catch {}
      }
    }
    if (added > 0) {
      showToast('success', 'Items Added', `${added} item${added > 1 ? 's' : ''} added to cart`);
      Alert.alert('Reorder', `${added} item${added > 1 ? 's' : ''} added to cart`, [
        { text: 'Continue Shopping' },
        { text: 'Go to Cart', onPress: () => router.push('/(tabs)/cart') },
      ]);
    } else {
      showToast('error', 'Error', 'Could not add items to cart');
    }
  };

  const handleShareInvoice = async () => {
    if (!order) return;
    haptic.light();
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subtotal = order.totals?.subtotal ?? 0;
    const tax = order.totals?.tax ?? 0;
    const shipping = order.totals?.shipping ?? 0;
    const discount = order.totals?.discount ?? 0;
    const total = order.totals?.total ?? 0;
    const payMethod = (order.payment?.method || 'Online').replace('razorpay', 'UPI/Card');
    const txnId = order.payment?.razorpayPaymentId || '';
    const shipTo = order.shipTo;
    const addr = [shipTo?.addressLine1, shipTo?.addressLine2].filter(Boolean).join(', ');
    const cityState = [shipTo?.city, shipTo?.state].filter(Boolean).join(', ');
    const isInterState = shipTo?.state && shipTo.state.toLowerCase() !== 'tamil nadu';
    const gstLabel = isInterState ? 'IGST' : 'GST';

    const itemRows = (order.items || []).map((item, i) => {
      const unitPrice = item.price ?? 0;
      const qty = item.quantity ?? 1;
      const lineTotal = unitPrice * qty;
      return `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>
          <strong>${item.product?.title || 'Product'}</strong>
          ${item.variant ? `<br/><span style="color:#6B7280;font-size:11px">Variant: ${item.variant}</span>` : ''}
        </td>
        <td style="text-align:center">${qty}</td>
        <td style="text-align:right">Rs.${unitPrice.toFixed(2)}</td>
        <td style="text-align:center">${discount > 0 ? '-' : '-'}</td>
        <td style="text-align:center">18%</td>
        <td style="text-align:right">Rs.${(unitPrice * qty * 0.18).toFixed(2)}</td>
        <td style="text-align:right"><strong>Rs.${(lineTotal * 1.18).toFixed(2)}</strong></td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
  @page { margin: 30px; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1F2937; font-size: 13px; line-height: 1.5;
    position: relative; }
  /* Watermark */
  body::before {
    content: 'VTECH';
    position: fixed; top: 40%; left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 120px; font-weight: 900; color: rgba(99, 102, 241, 0.04);
    letter-spacing: 20px; z-index: 0; pointer-events: none;
  }
  .invoice-wrap { position: relative; z-index: 1; padding: 10px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #6366F1; padding-bottom: 16px; margin-bottom: 20px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 54px; height: 54px; background: linear-gradient(135deg, #6366F1, #EC4899, #F59E0B, #10B981);
    border-radius: 14px; display: flex; align-items: center; justify-content: center;
    color: white; font-size: 20px; font-weight: 900; }
  .brand-name { font-size: 32px; font-weight: 800; color: #1F2937; letter-spacing: -1px; }
  .brand-url { font-size: 11px; color: #6B7280; margin-top: -2px; }
  .tax-invoice { text-align: right; }
  .tax-invoice h2 { font-size: 22px; color: #6366F1; font-weight: 700; letter-spacing: 1px; }
  .tax-invoice p { font-size: 11px; color: #6B7280; }

  /* Info sections */
  .info-grid { display: flex; gap: 20px; margin-bottom: 18px; }
  .info-box { flex: 1; background: #F9FAFB; border-radius: 10px; padding: 14px; border: 1px solid #E5E7EB; }
  .info-box h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
    color: #6366F1; font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; }
  .info-box p { font-size: 12px; color: #374151; margin-bottom: 2px; }
  .info-box strong { color: #1F2937; }

  /* Address grid */
  .addr-grid { display: flex; gap: 20px; margin-bottom: 18px; }
  .addr-box { flex: 1; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; }
  .addr-box h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
    color: #6366F1; font-weight: 700; margin-bottom: 8px; }
  .addr-box p { font-size: 12px; color: #374151; margin-bottom: 2px; }
  .addr-box .name { font-weight: 700; font-size: 13px; color: #1F2937; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  thead th { background: #6366F1; color: white; padding: 10px 8px; font-size: 11px;
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 8px 0 0 0; }
  thead th:last-child { border-radius: 0 8px 0 0; }
  tbody td { padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
  tbody tr:hover { background: #F9FAFB; }

  /* Summary */
  .summary-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  .summary-table { width: 320px; }
  .summary-table tr td { padding: 5px 10px; font-size: 12px; }
  .summary-table tr td:last-child { text-align: right; font-weight: 600; }
  .summary-table .grand-total td { font-size: 16px; font-weight: 800; color: #6366F1;
    border-top: 2px solid #6366F1; padding-top: 10px; }
  .free-tag { color: #10B981; font-weight: 700; }

  /* Words */
  .amount-words { background: #F9FAFB; border-radius: 8px; padding: 10px 14px;
    margin-bottom: 16px; border-left: 4px solid #6366F1; }
  .amount-words span { font-size: 11px; color: #6B7280; }
  .amount-words strong { font-size: 12px; color: #1F2937; }

  /* GST note */
  .gst-note { font-size: 10px; color: #6B7280; font-style: italic; margin-bottom: 20px; }

  /* Signature */
  .signature { text-align: right; margin-top: 20px; margin-bottom: 30px; }
  .signature .for { font-size: 12px; font-weight: 700; color: #1F2937; }
  .signature .auth { font-size: 11px; color: #6B7280; margin-top: 30px; }

  /* Footer */
  .warranty-box { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px;
    padding: 12px; margin-bottom: 12px; }
  .warranty-box h4 { font-size: 11px; font-weight: 700; color: #92400E; margin-bottom: 4px; }
  .warranty-box p { font-size: 10px; color: #78350F; }
  .return-policy { font-size: 10px; color: #6B7280; text-align: center; margin-bottom: 8px; }
  .footer-note { font-size: 10px; color: #9CA3AF; text-align: center; font-style: italic; margin-bottom: 8px; }
  .thank-you { text-align: center; font-size: 14px; font-weight: 700; color: #6366F1; margin-bottom: 4px; }
  .footer-contact { text-align: center; font-size: 10px; color: #6B7280; }
  hr.footer-line { border: none; border-top: 1px solid #E5E7EB; margin: 12px 0; }
</style></head>
<body><div class="invoice-wrap">

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-icon">V</div>
      <div>
        <div class="brand-name">Vtech</div>
        <div class="brand-url">www.vtechkitchen.com</div>
      </div>
    </div>
    <div class="tax-invoice">
      <h2>TAX INVOICE</h2>
      <p>Original for Recipient</p>
    </div>
  </div>

  <!-- Seller + Order Info -->
  <div class="info-grid">
    <div class="info-box">
      <h4>Sold By</h4>
      <p><strong>Vtech</strong></p>
      <p>9/83E, 4th Street Extension</p>
      <p>T Balan Nagar, Ganapathy Pudur</p>
      <p>Coimbatore &ndash; 641006, Tamil Nadu</p>
      <p>GSTIN: 33AARFV8415B1Z4</p>
      <p>PAN: AARFV8415B</p>
    </div>
    <div class="info-box">
      <h4>Order &amp; Invoice Details</h4>
      <p><strong>Order ID:</strong> #${order.orderId}</p>
      <p><strong>Order Date:</strong> ${orderDate}</p>
      <p><strong>Place of Supply:</strong> ${shipTo?.state || 'India'}</p>
      <p><strong>Payment Mode:</strong> ${payMethod}</p>
      <p><strong>Payment Status:</strong> ${order.payment?.status === 'completed' || order.payment?.status === 'paid' ? 'Paid' : (order.payment?.status || 'Pending')}</p>
      <p><strong>Delivery:</strong> Standard Delivery</p>
      ${txnId ? `<p><strong>Txn ID:</strong> ${txnId}</p>` : ''}
    </div>
  </div>

  <!-- Addresses -->
  <div class="addr-grid">
    <div class="addr-box">
      <h4>Billing Address</h4>
      <p class="name">${shipTo?.fullName || 'Customer'}</p>
      ${addr ? `<p>${addr}</p>` : ''}
      <p>${cityState}${shipTo?.pincode ? ` - ${shipTo.pincode}` : ''}</p>
      <p>${shipTo?.country || 'India'}</p>
      ${shipTo?.phone ? `<p>Phone: ${shipTo.phone}</p>` : ''}
    </div>
    <div class="addr-box">
      <h4>Shipping Address</h4>
      <p class="name">${shipTo?.fullName || 'Customer'}</p>
      ${addr ? `<p>${addr}</p>` : ''}
      <p>${cityState}${shipTo?.pincode ? ` - ${shipTo.pincode}` : ''}</p>
      <p>${shipTo?.country || 'India'}</p>
      ${shipTo?.phone ? `<p>Phone: ${shipTo.phone}</p>` : ''}
    </div>
  </div>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center">#</th>
        <th>Product</th>
        <th style="width:40px;text-align:center">Qty</th>
        <th style="width:80px;text-align:right">Unit Price</th>
        <th style="width:65px;text-align:center">Discount</th>
        <th style="width:50px;text-align:center">GST %</th>
        <th style="width:70px;text-align:right">${gstLabel}</th>
        <th style="width:85px;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Summary -->
  <div class="summary-row">
    <table class="summary-table">
      <tr><td>Subtotal</td><td>Rs.${subtotal.toFixed(2)}</td></tr>
      ${discount > 0 ? `<tr><td>Discount</td><td style="color:#10B981">-Rs.${discount.toFixed(2)}</td></tr>` : ''}
      <tr><td>${gstLabel} (18%)</td><td>Rs.${tax.toFixed(2)}</td></tr>
      <tr><td>Shipping</td><td>${shipping === 0 ? '<span class="free-tag">FREE</span>' : `Rs.${shipping.toFixed(2)}`}</td></tr>
      <tr class="grand-total"><td>Grand Total</td><td>Rs.${total.toFixed(2)}</td></tr>
    </table>
  </div>

  <!-- Amount in words -->
  <div class="amount-words">
    <span>Amount in Words:</span><br/>
    <strong>${amountToWords(total)}</strong>
  </div>

  <!-- GST Note -->
  <p class="gst-note">
    * GST has been charged separately as shown above.<br/>
    Whether tax is payable under reverse charge: No
  </p>

  <!-- Signature -->
  <div class="signature">
    <p class="for">For Vtech</p>
    <p class="auth">Authorized Signatory</p>
  </div>

  <hr class="footer-line"/>

  <!-- Warranty -->
  <div class="warranty-box">
    <h4>Warranty Information</h4>
    <p>For warranty claims, contact us with your invoice number and product details.
    Warranty covers manufacturing defects only and does not cover damage caused by misuse,
    accidents, or unauthorized modifications. Keep this invoice as proof of purchase for all warranty claims.</p>
  </div>

  <p class="return-policy">
    <strong>Return Policy:</strong> Products can be returned within 7 days of delivery if unused and in original packaging.
    No returns on used or installed items.
  </p>
  <p class="footer-note">This is a computer-generated invoice and does not require a physical signature.</p>
  <p class="thank-you">Thank you for shopping with Vtech!</p>
  <p class="footer-contact">vtechshop.customercare@gmail.com | +919944556683 | www.vtechkitchen.com</p>

</div></body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice #${order.orderId}` });
      } else {
        showToast('info', 'Invoice saved', uri);
      }
    } catch {
      showToast('error', 'Error', 'Failed to generate invoice');
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

        {/* Tracking Map */}
        {['shipped', 'processing', 'confirmed'].includes(order.status) && (
          <View style={{ marginTop: spacing.md }}>
            <TrackingMap
              status={order.status}
              trackingId={order.tracking?.trackingId}
              trackingUrl={order.tracking?.url}
              provider={order.tracking?.provider}
            />
          </View>
        )}

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
          <Button title="Download Invoice" variant="outline" onPress={handleShareInvoice} style={{ flex: 1 }} />
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
