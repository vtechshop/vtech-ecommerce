import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../src/store';
import { userApi } from '../../src/api/user';
import { paymentApi } from '../../src/api/payment';
import { ordersApi } from '../../src/api/orders';
import { Address } from '../../src/types';
import Button from '../../src/components/ui/Button';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

export default function CheckoutScreen() {
  const { cart } = useAppSelector((s) => s.cart);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    userApi.getAddresses().then((res) => {
      setAddresses(res.data.data);
      const defaultAddr = res.data.data.find((a) => a.isDefault);
      if (defaultAddr?._id) setSelectedAddress(defaultAddr._id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePayment = async () => {
    if (!selectedAddress || !cart) return;
    setProcessing(true);

    try {
      // Create Razorpay order
      const { data: orderData } = await paymentApi.createRazorpayOrder(cart.totals.total);
      const razorpayOrder = orderData.data;

      // In a real app, you'd open Razorpay SDK here:
      // import RazorpayCheckout from 'react-native-razorpay';
      // const result = await RazorpayCheckout.open({ ... });

      // For now, simulate payment flow
      Alert.alert(
        'Payment',
        `Razorpay order created: ${razorpayOrder.id}\nAmount: ₹${(razorpayOrder.amount / 100).toLocaleString()}\n\nIntegrate Razorpay React Native SDK to process payment.`,
        [
          {
            text: 'Simulate Success',
            onPress: async () => {
              try {
                const { data } = await ordersApi.create({
                  addressId: selectedAddress,
                  paymentMethod: 'razorpay',
                  razorpayOrderId: razorpayOrder.id,
                  razorpayPaymentId: 'simulated_payment_id',
                  razorpaySignature: 'simulated_signature',
                });
                Alert.alert('Order Placed!', `Order ID: ${data.data.orderId}`, [
                  { text: 'View Order', onPress: () => router.replace(`/orders/${data.data._id}` as any) },
                ]);
              } catch (e: any) {
                Alert.alert('Error', e.response?.data?.message || 'Order creation failed');
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (e: any) {
      Alert.alert('Payment Error', e.response?.data?.message || 'Payment initiation failed');
    }

    setProcessing(false);
  };

  if (loading) return <LoadingScreen />;
  if (!cart) return <LoadingScreen message="Cart not found" />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Address Selection */}
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        {addresses.map((addr) => (
          <TouchableOpacity
            key={addr._id}
            style={[styles.addressCard, selectedAddress === addr._id && styles.addressSelected]}
            onPress={() => setSelectedAddress(addr._id!)}
          >
            <View style={styles.radioOuter}>
              {selectedAddress === addr._id && <View style={styles.radioInner} />}
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{addr.fullName}</Text>
              <Text style={styles.addressLine}>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</Text>
              <Text style={styles.addressLine}>{addr.city}, {addr.state} - {addr.pincode}</Text>
              <Text style={styles.addressPhone}>{addr.phone}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {addresses.length === 0 && (
          <Text style={styles.noAddress}>No addresses found. Add an address to continue.</Text>
        )}

        {/* Order Summary */}
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.itemCount}>{cart.items.length} item(s)</Text>
          <View style={styles.summaryRow}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>₹{cart.totals.subtotal.toLocaleString()}</Text></View>
          {cart.totals.discount > 0 && <View style={styles.summaryRow}><Text style={styles.label}>Discount</Text><Text style={[styles.value, { color: colors.success }]}>-₹{cart.totals.discount.toLocaleString()}</Text></View>}
          <View style={styles.summaryRow}><Text style={styles.label}>Tax</Text><Text style={styles.value}>₹{cart.totals.tax.toLocaleString()}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.label}>Shipping</Text><Text style={styles.value}>₹{cart.totals.shipping.toLocaleString()}</Text></View>
          <View style={[styles.summaryRow, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>₹{cart.totals.total.toLocaleString()}</Text></View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.payLabel}>Total</Text>
          <Text style={styles.payAmount}>₹{cart.totals.total.toLocaleString()}</Text>
        </View>
        <Button
          title="Pay Now"
          onPress={handlePayment}
          loading={processing}
          disabled={!selectedAddress}
          size="lg"
          style={{ flex: 1, marginLeft: spacing.md }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  addressCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  addressSelected: { borderColor: colors.primary, backgroundColor: '#F0F0FF' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, marginTop: 2 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  addressInfo: { flex: 1 },
  addressName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  addressLine: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  addressPhone: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  noAddress: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', padding: spacing.lg },
  summaryCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md },
  itemCount: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { fontSize: fontSize.md, color: colors.textSecondary },
  value: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  totalLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
  bottomBar: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  payLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  payAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
});
