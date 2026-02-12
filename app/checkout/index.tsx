import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {
  // Not available in Expo Go - requires dev build
}
import { useAppSelector } from '../../src/store';
import { userApi } from '../../src/api/user';
import { paymentApi } from '../../src/api/payment';
import { ordersApi } from '../../src/api/orders';
import { Address } from '../../src/types';
import Button from '../../src/components/ui/Button';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing, gradients } from '../../src/theme';

const emptyAddress: Omit<Address, '_id'> = {
  fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', country: 'India',
};

type DeliveryMethod = 'standard' | 'express';

const DELIVERY_OPTIONS: { key: DeliveryMethod; label: string; desc: string; price: number; days: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'standard', label: 'Standard Delivery', desc: 'Free shipping on all orders', price: 0, days: '5-7 business days', icon: 'bicycle-outline' },
  { key: 'express', label: 'Express Delivery', desc: 'Priority handling & faster shipping', price: 99, days: '2-3 business days', icon: 'rocket-outline' },
];

export default function CheckoutScreen() {
  const { cart } = useAppSelector((s) => s.cart);
  const { user } = useAppSelector((s) => s.auth);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('standard');
  const [locatingGPS, setLocatingGPS] = useState(false);

  const loadAddresses = async () => {
    try {
      const res = await userApi.getAddresses();
      const data = res.data.data || [];
      setAddresses(data);
      if (!selectedAddress) {
        const defaultAddr = data.find((a: Address) => a.isDefault);
        if (defaultAddr?._id) setSelectedAddress(defaultAddr._id);
        else if (data.length > 0) setSelectedAddress(data[0]._id!);
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load addresses');
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadAddresses(); }, []));

  const handleAddAddress = async () => {
    if (!form.fullName || !form.phone || !form.addressLine1 || !form.city || !form.state || !form.pincode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const { data } = await userApi.addAddress(form as Address);
      const newAddr = data.data;
      setShowAddForm(false);
      setForm(emptyAddress);
      await loadAddresses();
      if (newAddr?._id) setSelectedAddress(newAddr._id);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add address');
    }
    setSaving(false);
  };

  const handleGPSAutoFill = async () => {
    setLocatingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to auto-fill address');
        setLocatingGPS(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (geocode) {
        setForm((prev) => ({
          ...prev,
          addressLine1: [geocode.streetNumber, geocode.street].filter(Boolean).join(' ') || prev.addressLine1,
          addressLine2: geocode.district || prev.addressLine2 || '',
          city: geocode.city || geocode.subregion || prev.city,
          state: geocode.region || prev.state,
          pincode: geocode.postalCode || prev.pincode,
          country: geocode.country || 'India',
        }));
        Alert.alert('Location Found', 'Address fields have been auto-filled. Please verify and complete any missing details.');
      }
    } catch {
      Alert.alert('Error', 'Could not determine your location. Please enter address manually.');
    }
    setLocatingGPS(false);
  };

  const selectedDelivery = DELIVERY_OPTIONS.find((d) => d.key === deliveryMethod)!;
  const deliveryCharge = selectedDelivery.price;
  const subtotal = cart?.totals?.subtotal ?? 0;
  const tax = cart?.totals?.tax ?? 0;
  const discount = cart?.totals?.discount ?? 0;
  const baseShipping = cart?.totals?.shipping ?? 0;
  const finalShipping = deliveryMethod === 'express' ? deliveryCharge : baseShipping;
  const grandTotal = subtotal - discount + tax + finalShipping;

  const handlePayment = async () => {
    if (!selectedAddress || !cart) return;

    if (!RazorpayCheckout) {
      Alert.alert(
        'Dev Build Required',
        'Payment requires a production build. Razorpay is not available in Expo Go.',
      );
      return;
    }

    setProcessing(true);

    try {
      const [keyRes, orderRes] = await Promise.all([
        paymentApi.getRazorpayKey(),
        paymentApi.createRazorpayOrder(grandTotal),
      ]);
      const razorpayKey = keyRes.data.data.key;
      const razorpayOrder = orderRes.data.data;

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'V-Tech Mobile',
        description: `Order Payment`,
        order_id: razorpayOrder.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: colors.primary },
      };

      const paymentResult = await RazorpayCheckout.open(options);

      await paymentApi.verifyPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      const { data } = await ordersApi.create({
        addressId: selectedAddress,
        paymentMethod: 'razorpay',
        razorpayOrderId: paymentResult.razorpay_order_id,
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpaySignature: paymentResult.razorpay_signature,
        notes: orderNotes.trim() || undefined,
      });

      Alert.alert('Order Placed!', `Order ID: ${data.data.orderId}`, [
        { text: 'View Order', onPress: () => router.replace(`/orders/${data.data._id}` as any) },
      ]);
    } catch (e: any) {
      if (e?.code === 'PAYMENT_CANCELLED') {
        // User cancelled
      } else if (e?.error?.reason) {
        try {
          await paymentApi.handleFailure({ razorpay_order_id: e?.error?.metadata?.order_id || '', error: e.error });
        } catch { /* best-effort */ }
        Alert.alert('Payment Failed', e.error.description || 'Payment could not be completed');
      } else {
        Alert.alert('Payment Error', e.response?.data?.message || e.message || 'Payment initiation failed');
      }
    }

    setProcessing(false);
  };

  if (loading) return <LoadingScreen />;
  if (!cart) return <LoadingScreen message="Cart not found" />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Checkout Progress */}
        <View style={styles.progressRow}>
          {['Address', 'Delivery', 'Payment'].map((step, i) => (
            <React.Fragment key={step}>
              <View style={styles.progressStep}>
                <View style={[styles.progressDot, styles.progressDotActive]}>
                  <Text style={styles.progressDotText}>{i + 1}</Text>
                </View>
                <Text style={[styles.progressLabel, styles.progressLabelActive]}>{step}</Text>
              </View>
              {i < 2 && <View style={[styles.progressLine, styles.progressLineActive]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Address Selection */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="location" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/orders/addresses' as any)} style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

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
              <View style={styles.addressNameRow}>
                <Text style={styles.addressName}>{addr.fullName}</Text>
                {addr.isDefault && (
                  <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>Default</Text></View>
                )}
              </View>
              <Text style={styles.addressLine}>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</Text>
              <Text style={styles.addressLine}>{addr.city}, {addr.state} - {addr.pincode}</Text>
              <Text style={styles.addressPhone}>{addr.phone}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Add New Address */}
        {!showAddForm ? (
          <TouchableOpacity style={styles.addAddressBtn} onPress={() => setShowAddForm(true)}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.addAddressText}>Add New Address</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.formTitle}>New Address</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.infoLight, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 1, borderRadius: borderRadius.full }}
                onPress={handleGPSAutoFill}
                disabled={locatingGPS}
              >
                {locatingGPS ? (
                  <ActivityIndicator size={14} color={colors.info} />
                ) : (
                  <Ionicons name="location" size={14} color={colors.info} />
                )}
                <Text style={{ fontSize: fontSize.xs, color: colors.info, fontWeight: fontWeight.semibold }}>
                  {locatingGPS ? 'Locating...' : 'Use My Location'}
                </Text>
              </TouchableOpacity>
            </View>
            {[
              { key: 'fullName', label: 'Full Name *', placeholder: 'John Doe' },
              { key: 'phone', label: 'Phone *', placeholder: '9876543210', keyboard: 'phone-pad' as const },
              { key: 'addressLine1', label: 'Address Line 1 *', placeholder: '123 Main St' },
              { key: 'addressLine2', label: 'Address Line 2', placeholder: 'Apartment, floor...' },
              { key: 'city', label: 'City *', placeholder: 'Chennai' },
              { key: 'state', label: 'State *', placeholder: 'Tamil Nadu' },
              { key: 'pincode', label: 'Pincode *', placeholder: '600001', keyboard: 'numeric' as const },
            ].map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[field.key]}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, [field.key]: val }))}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboard || 'default'}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            ))}
            <View style={styles.formActions}>
              <Button title="Cancel" variant="outline" onPress={() => { setShowAddForm(false); setForm(emptyAddress); }} style={{ flex: 1 }} />
              <Button title="Save Address" onPress={handleAddAddress} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Delivery Method */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="car" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Delivery Method</Text>
        </View>

        {DELIVERY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optionCard, deliveryMethod === opt.key && styles.optionSelected]}
            onPress={() => setDeliveryMethod(opt.key)}
          >
            <View style={styles.radioOuter}>
              {deliveryMethod === opt.key && <View style={styles.radioInner} />}
            </View>
            <View style={[styles.optionIcon, deliveryMethod === opt.key && styles.optionIconActive]}>
              <Ionicons name={opt.icon} size={20} color={deliveryMethod === opt.key ? colors.primary : colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.optionTitleRow}>
                <Text style={[styles.optionLabel, deliveryMethod === opt.key && styles.optionLabelActive]}>{opt.label}</Text>
                <Text style={[styles.optionPrice, deliveryMethod === opt.key && styles.optionPriceActive]}>
                  {opt.price === 0 ? 'FREE' : `₹${opt.price}`}
                </Text>
              </View>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
              <View style={styles.optionDaysRow}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.optionDays}>{opt.days}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Payment Info */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="wallet" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Payment</Text>
        </View>

        <View style={[styles.optionCard, styles.optionSelected]}>
          <View style={[styles.optionIcon, styles.optionIconActive]}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionLabel, styles.optionLabelActive]}>Pay Online (Razorpay)</Text>
            <Text style={styles.optionDesc}>UPI, Cards, Net Banking, Wallets</Text>
          </View>
          <Ionicons name="shield-checkmark" size={18} color={colors.success} />
        </View>

        {/* Order Notes */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Order Notes</Text>
          <Text style={styles.optionalTag}>Optional</Text>
        </View>

        <View style={styles.notesCard}>
          <TextInput
            style={styles.notesInput}
            value={orderNotes}
            onChangeText={setOrderNotes}
            placeholder="Add special instructions for delivery (e.g., Leave at door, Call before delivery...)"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={250}
          />
          <Text style={styles.charCount}>{orderNotes.length}/250</Text>
        </View>

        {/* Cart Items Preview */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="bag" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Order Items ({cart.items?.length ?? 0})</Text>
        </View>

        <View style={styles.itemsCard}>
          {cart.items.map((item, idx) => (
            <View key={item._id} style={[styles.cartItem, idx < cart.items.length - 1 && styles.cartItemBorder]}>
              {item.product?.images?.[0] ? (
                <Image source={{ uri: item.product.images[0] }} style={styles.cartItemImage} contentFit="cover" />
              ) : (
                <View style={[styles.cartItemImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={16} color={colors.border} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemTitle} numberOfLines={1}>{item.product?.title || 'Product'}</Text>
                <Text style={styles.cartItemMeta}>Qty: {item.quantity} x ₹{(item.price ?? 0).toLocaleString()}</Text>
              </View>
              <Text style={styles.cartItemTotal}>₹{((item.price ?? 0) * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="receipt" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Price Details</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>₹{subtotal.toLocaleString()}</Text></View>
          {discount > 0 && <View style={styles.summaryRow}><Text style={styles.label}>Discount</Text><Text style={[styles.value, { color: colors.success }]}>-₹{discount.toLocaleString()}</Text></View>}
          <View style={styles.summaryRow}><Text style={styles.label}>Tax (GST)</Text><Text style={styles.value}>₹{tax.toLocaleString()}</Text></View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Shipping ({selectedDelivery.label})</Text>
            <Text style={[styles.value, finalShipping === 0 ? { color: colors.success } : {}]}>
              {finalShipping === 0 ? 'FREE' : `₹${finalShipping.toLocaleString()}`}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Secure Checkout Badge */}
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={styles.secureText}>100% Secure & Encrypted Checkout</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.payLabel}>Total</Text>
          <Text style={styles.payAmount}>₹{grandTotal.toLocaleString()}</Text>
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
  content: { padding: spacing.md, paddingBottom: 120 },
  // Progress bar
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, marginBottom: spacing.sm },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  progressDotText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.white },
  progressLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4, fontWeight: fontWeight.medium },
  progressLabelActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  progressLine: { width: 50, height: 2, backgroundColor: colors.border, marginHorizontal: spacing.xs, marginBottom: 18 },
  progressLineActive: { backgroundColor: colors.primary },
  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  sectionIcon: { width: 32, height: 32, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  optionalTag: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, marginLeft: 'auto' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  manageBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  // Address
  addressCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  addressSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md, marginTop: 2 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  addressInfo: { flex: 1 },
  addressNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  defaultBadge: { backgroundColor: colors.primaryLighter, paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: borderRadius.full },
  defaultBadgeText: { fontSize: 10, color: colors.primary, fontWeight: fontWeight.bold },
  addressLine: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  addressPhone: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  addAddressText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.semibold },
  // Form
  formCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  fieldGroup: { marginBottom: spacing.sm },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.xl, padding: spacing.sm + 4, fontSize: fontSize.md, color: colors.text, backgroundColor: colors.surface },
  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  // Options (delivery/payment)
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLightest },
  optionIcon: { width: 36, height: 36, borderRadius: borderRadius.lg, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  optionIconActive: { backgroundColor: colors.primaryLighter },
  optionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  optionLabelActive: { color: colors.primary },
  optionPrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  optionPriceActive: { color: colors.success },
  optionDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  optionDaysRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  optionDays: { fontSize: fontSize.xs, color: colors.textSecondary },
  // Order Notes
  notesCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  notesInput: { fontSize: fontSize.md, color: colors.text, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'right', marginTop: spacing.xs },
  // Cart Items Preview
  itemsCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.sm },
  cartItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  cartItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  cartItemImage: { width: 44, height: 44, borderRadius: borderRadius.md },
  cartItemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  cartItemMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  cartItemTotal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  // Summary
  summaryCard: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { fontSize: fontSize.md, color: colors.textSecondary },
  value: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  totalLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.text, letterSpacing: letterSpacing.tight },
  totalValue: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.primary, letterSpacing: letterSpacing.tight },
  // Secure badge
  secureBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, marginTop: spacing.sm },
  secureText: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.medium },
  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 0,
    alignItems: 'center',
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    ...shadows.xl,
  },
  payLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  payAmount: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, color: colors.primary, letterSpacing: letterSpacing.tight },
});
