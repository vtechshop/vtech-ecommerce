import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator, Pressable, Modal } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { updateCartItem, removeCartItem } from '../../src/store/slices/cartSlice';
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
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedProgressDot({ step, index }: { step: string; index: number }) {
  const dotScale = useSharedValue(0);
  const lineWidth = useSharedValue(0);

  useEffect(() => {
    dotScale.value = withDelay(index * 200, withSpring(1, { damping: 10, stiffness: 200 }));
    if (index < 2) {
      lineWidth.value = withDelay(index * 200 + 100, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    }
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: lineWidth.value }],
  }));

  return (
    <React.Fragment>
      <View style={styles.progressStep}>
        <Animated.View style={[styles.progressDot, styles.progressDotActive, dotStyle]}>
          <Text style={styles.progressDotText}>{index + 1}</Text>
        </Animated.View>
        <Text style={[styles.progressLabel, styles.progressLabelActive]}>{step}</Text>
      </View>
      {index < 2 && <Animated.View style={[styles.progressLine, styles.progressLineActive, lineStyle]} />}
    </React.Fragment>
  );
}

function AnimatedOptionCard({ children, isSelected, onPress }: {
  children: React.ReactNode; isSelected: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.optionCard, isSelected && styles.optionSelected, animStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function CheckoutScreen() {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const dispatch = useAppDispatch();
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
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [razorpayWebView, setRazorpayWebView] = useState<{
    html: string;
    internalOrderId: string;
    displayOrderId: string;
  } | null>(null);
  const razorpayResolveRef = useRef<((result: any) => void) | null>(null);
  const razorpayRejectRef = useRef<((err: any) => void) | null>(null);

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

  const handlePincodeLookup = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setForm((prev) => ({
          ...prev,
          city: po.District || po.Block || po.Name || prev.city,
          state: po.State || prev.state,
        }));
      }
    } catch {}
    setPincodeLoading(false);
  };

  const INDIAN_STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
    'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
    'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
    'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
    'West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
  ];

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

    setProcessing(true);

    try {
      // Build items with correct field names (backend expects 'qty' not 'quantity')
      const orderItems = (cart.items ?? []).map((item) => {
        const productId = String(
          item.product?._id ||
          (item as any).productId?._id ||
          (item as any).productId || ''
        ).replace(/^undefined$|^null$/, '');
        const qty = Math.min(99, Math.max(1, Math.floor(Number(item.quantity) || Number((item as any).qty) || 1)));
        return { productId, qty };
      }).filter((i) => i.productId && i.productId !== 'undefined' && i.productId !== 'null');

      if (orderItems.length === 0) {
        Alert.alert('Error', 'Cart is empty. Please go back and add products.');
        setProcessing(false);
        return;
      }

      // Backend expects 'shipTo' as address object, not 'addressId'
      const addr = addresses.find((a) => a._id === selectedAddress);
      const shipTo = addr ? {
        fullName: addr.fullName,
        phone: addr.phone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 || '',
        city: addr.city,
        state: addr.state,
        zipCode: addr.pincode,
        country: addr.country || 'India',
      } : undefined;

      const { data: orderData } = await ordersApi.create({
        addressId: selectedAddress,
        shipTo,
        paymentMethod: 'razorpay',
        items: orderItems as any,
        notes: orderNotes.trim() || undefined,
      } as any);
      // Backend returns { vendorOrders: [{_id, orderId, ...}], orderIds: [...], totalAmount }
      const orderResponse = orderData.data;
      const firstVendorOrder = orderResponse.vendorOrders?.[0];
      const internalOrderId = firstVendorOrder?._id;
      const displayOrderId = orderResponse.orderIds?.[0] || firstVendorOrder?.orderId || internalOrderId;

      if (!internalOrderId) {
        Alert.alert('Order Error', 'Could not retrieve order ID from server. Please contact support.');
        setProcessing(false);
        return;
      }

      // Step 2: Get Razorpay key and create Razorpay order with internal orderId
      const [keyRes, razorpayOrderRes] = await Promise.all([
        paymentApi.getRazorpayKey(),
        paymentApi.createRazorpayOrder(Math.round(grandTotal * 100), internalOrderId),
      ]);
      const razorpayKey = keyRes.data.keyId;
      const razorpayOrder = razorpayOrderRes.data.data;

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'V-Tech Kitchen',
        description: `Order #${displayOrderId}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: colors.primary },
      };

      // Use WebView-based Razorpay checkout (works in Expo Go)
      const razorpayHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; }
    .loading { font-family: sans-serif; font-size: 16px; color: #333; text-align: center; }
  </style>
</head>
<body>
  <div class="loading">Opening Payment...</div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    var opts = ${JSON.stringify(options)};
    opts.handler = function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', data: response }));
    };
    opts.modal = {
      ondismiss: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CANCELLED' }));
      }
    };
    window.onload = function() {
      var rzp = new Razorpay(opts);
      rzp.on('payment.failed', function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', data: response.error }));
      });
      rzp.open();
    };
  </script>
</body>
</html>`;

      const paymentResult: any = await new Promise((resolve, reject) => {
        razorpayResolveRef.current = resolve;
        razorpayRejectRef.current = reject;
        setRazorpayWebView({ html: razorpayHtml, internalOrderId, displayOrderId });
      });

      // Step 3: Verify payment
      await paymentApi.verifyPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      Alert.alert('Order Placed!', `Order ID: ${displayOrderId}`, [
        { text: 'View Order', onPress: () => router.replace(`/orders/${internalOrderId}` as any) },
      ]);
    } catch (e: any) {
      if (e?.code === 'PAYMENT_CANCELLED' || e?.type === 'CANCELLED') {
        // User cancelled — do nothing
      } else if (e?.error?.reason) {
        try {
          await paymentApi.handleFailure({ razorpay_order_id: e?.error?.metadata?.order_id || '', error: e.error });
        } catch { /* best-effort */ }
        Alert.alert('Payment Failed', e.error.description || 'Payment could not be completed');
      } else {
        const code = e.response?.data?.code || '';
        const rawMsg = e.response?.data?.message || e.response?.data?.error || e.message || 'Payment initiation failed';
        const errMsg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
        if (code === 'INVALID_QUANTITY' || code === 'ITEMS_REQUIRED') {
          Alert.alert(
            'Cart Issue',
            'One or more products in your cart are invalid or out of stock. Please go back to cart, remove invalid items, and try again.',
            [{ text: 'Edit Cart', onPress: () => router.back() }, { text: 'OK' }],
          );
        } else {
          Alert.alert('Payment Error', errMsg);
        }
      }
    }

    setProcessing(false);
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      setRazorpayWebView(null);
      if (msg.type === 'SUCCESS') {
        razorpayResolveRef.current?.(msg.data);
      } else if (msg.type === 'CANCELLED') {
        razorpayRejectRef.current?.({ type: 'CANCELLED' });
      } else if (msg.type === 'FAILED') {
        razorpayRejectRef.current?.({ error: msg.data });
      }
    } catch {}
  };

  if (loading) return <LoadingScreen />;
  if (!cart) return <LoadingScreen message="Cart not found" />;

  return (
    <View style={styles.container}>
      {/* Razorpay WebView Modal */}
      {razorpayWebView && (
        <Modal visible animationType="slide" onRequestClose={() => {
          setRazorpayWebView(null);
          razorpayRejectRef.current?.({ type: 'CANCELLED' });
        }}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingTop: 44, paddingBottom: 12, paddingHorizontal: 16 }}>
              <TouchableOpacity onPress={() => {
                setRazorpayWebView(null);
                razorpayRejectRef.current?.({ type: 'CANCELLED' });
              }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 12 }}>Secure Payment</Text>
            </View>
            <WebView
              source={{ html: razorpayWebView.html }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading Payment...</Text>
                </View>
              )}
            />
          </View>
        </Modal>
      )}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Checkout Progress */}
        <View style={styles.progressRow}>
          {['Address', 'Delivery', 'Payment'].map((step, i) => (
            <AnimatedProgressDot key={step} step={step} index={i} />
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
            {/* Header */}
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Add New Address</Text>
              <TouchableOpacity style={styles.locationBtn} onPress={handleGPSAutoFill} disabled={locatingGPS}>
                {locatingGPS
                  ? <ActivityIndicator size={13} color={colors.primary} />
                  : <Ionicons name="locate" size={13} color={colors.primary} />}
                <Text style={styles.locationBtnText}>{locatingGPS ? 'Detecting...' : 'Use my location'}</Text>
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput style={styles.input} value={form.fullName}
                onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))}
                placeholder="First and last name" placeholderTextColor={colors.textSecondary} />
            </View>

            {/* Mobile */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+91</Text></View>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={form.phone}
                  onChangeText={(v) => setForm((p) => ({ ...p, phone: v.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="10-digit mobile number" placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad" maxLength={10} />
              </View>
            </View>

            {/* Pincode */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PIN code</Text>
              <View style={styles.pincodeRow}>
                <View style={{ flex: 1, position: 'relative' }}>
                  <TextInput style={styles.input}
                    value={form.pincode}
                    onChangeText={(v) => {
                      const clean = v.replace(/\D/g, '').slice(0, 6);
                      setForm((p) => ({ ...p, pincode: clean }));
                      if (clean.length === 6) handlePincodeLookup(clean);
                    }}
                    placeholder="6-digit PIN code" placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric" maxLength={6} />
                  {pincodeLoading && (
                    <ActivityIndicator size={14} color={colors.primary} style={{ position: 'absolute', right: 12, top: 14 }} />
                  )}
                </View>
              </View>
              {form.pincode.length === 6 && form.city ? (
                <View style={styles.pincodeSuccess}>
                  <Ionicons name="checkmark-circle" size={14} color="#067D62" />
                  <Text style={styles.pincodeSuccessText}>{form.city}, {form.state}</Text>
                </View>
              ) : null}
            </View>

            {/* Flat/House/Building */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Flat, House no., Building, Company, Apartment</Text>
              <TextInput style={styles.input} value={form.addressLine1}
                onChangeText={(v) => setForm((p) => ({ ...p, addressLine1: v }))}
                placeholder="e.g. 12B, Sunshine Apartments" placeholderTextColor={colors.textSecondary} />
            </View>

            {/* Area/Street */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Area, Colony, Street, Sector, Village</Text>
              <TextInput style={styles.input} value={form.addressLine2}
                onChangeText={(v) => setForm((p) => ({ ...p, addressLine2: v }))}
                placeholder="e.g. Anna Nagar, OMR Road" placeholderTextColor={colors.textSecondary} />
            </View>

            {/* Town/City — auto-filled, editable */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Town/City</Text>
              <TextInput style={styles.input} value={form.city}
                onChangeText={(v) => setForm((p) => ({ ...p, city: v }))}
                placeholder="Town or city" placeholderTextColor={colors.textSecondary} />
            </View>

            {/* State — dropdown, auto-filled */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>State</Text>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }]}
                onPress={() => setShowStatePicker(true)}
              >
                <Text style={{ fontSize: fontSize.md, color: form.state ? colors.text : colors.textSecondary }}>
                  {form.state || '-- Select --'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* State Picker Modal */}
            <Modal visible={showStatePicker} animationType="slide" onRequestClose={() => setShowStatePicker(false)}>
              <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingTop: 44, paddingBottom: 14, paddingHorizontal: 16, gap: 14, backgroundColor: '#fff' }}>
                  <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                    <Ionicons name="arrow-back" size={22} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Select State</Text>
                </View>
                <ScrollView>
                  {INDIAN_STATES.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', backgroundColor: form.state === state ? colors.primaryLightest : '#fff' }}
                      onPress={() => { setForm((p) => ({ ...p, state })); setShowStatePicker(false); }}
                    >
                      <Text style={{ fontSize: 15, color: form.state === state ? colors.primary : colors.text, fontWeight: form.state === state ? '700' : '400' }}>
                        {state}
                      </Text>
                      {form.state === state && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Modal>
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
          <AnimatedOptionCard
            key={opt.key}
            isSelected={deliveryMethod === opt.key}
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
          </AnimatedOptionCard>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>Edit Cart</Text>
            <Ionicons name="create-outline" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.itemsCard}>
          {(cart.items ?? []).map((item, idx) => (
            <View key={item._id} style={[styles.cartItem, idx < (cart.items?.length ?? 0) - 1 && styles.cartItemBorder]}>
              {item.product?.images?.[0] ? (
                <Image source={{ uri: item.product.images[0] }} style={styles.cartItemImage} contentFit="cover" />
              ) : (
                <View style={[styles.cartItemImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={16} color={colors.border} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemTitle} numberOfLines={2}>{item.product?.title || 'Product'}</Text>
                <Text style={styles.cartItemPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
                {/* Quantity Controls */}
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.quantity <= 1) {
                        Alert.alert('Remove Item', 'Remove this item?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeCartItem(item._id)) },
                        ]);
                      } else {
                        dispatch(updateCartItem({ itemId: item._id, quantity: item.quantity - 1 }));
                      }
                    }}
                  >
                    <Ionicons name={item.quantity <= 1 ? 'trash-outline' : 'remove'} size={14} color={item.quantity <= 1 ? colors.error : colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => dispatch(updateCartItem({ itemId: item._id, quantity: item.quantity + 1 }))}
                  >
                    <Ionicons name="add" size={14} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.cartItemMeta}>= ₹{((item.price ?? 0) * item.quantity).toLocaleString()}</Text>
                </View>
              </View>
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

      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 12) }]}>
        <View style={{ justifyContent: 'center' }}>
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
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  formTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  locationBtnText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#d5d9d9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: fontSize.md, color: colors.text, backgroundColor: '#fff' },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  phonePrefix: { borderWidth: 1.5, borderColor: '#d5d9d9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#f0f2f5' },
  phonePrefixText: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  pincodeRow: { flexDirection: 'row', gap: 8 },
  pincodeSuccess: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  pincodeSuccessText: { fontSize: 12, color: '#067D62', fontWeight: '600' },
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
  cartItem: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md, gap: spacing.sm },
  cartItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceDark },
  cartItemImage: { width: 56, height: 56, borderRadius: borderRadius.md },
  cartItemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, lineHeight: 18 },
  cartItemPrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text, marginTop: 2 },
  cartItemMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginLeft: spacing.sm },
  cartItemTotal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  qtyNum: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, minWidth: 28, textAlign: 'center', color: colors.text },
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
