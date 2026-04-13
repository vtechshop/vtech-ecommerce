import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchCart, updateCartItem, removeCartItem, applyCoupon, addToCart } from '../../src/store/slices/cartSlice';
import { productsApi } from '../../src/api/products';
import { Product, CartItem } from '../../src/types';
import AnimatedProductCard from '../../src/components/product/AnimatedProductCard';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { useToast } from '../../src/components/ui/Toast';
import { haptic } from '../../src/utils/haptics';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

const SAVED_KEY = '@vtech_saved_for_later';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedEmptyCart() {
  const iconScale = useSharedValue(0);
  const iconFloat = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(100, withSpring(1, { damping: 8, stiffness: 150 }));
    iconFloat.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ), -1, true
    ));
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    btnOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }, { translateY: iconFloat.value }],
  }));

  return (
    <View style={styles.empty}>
      <Animated.View style={[styles.emptyIconCircle, iconStyle]}>
        <Ionicons name="cart-outline" size={48} color={colors.primary} />
      </Animated.View>
      <Animated.Text style={[styles.emptyTitle, { opacity: titleOpacity }]}>Your cart is empty</Animated.Text>
      <Animated.Text style={[styles.emptyText, { opacity: subtitleOpacity }]}>
        Add items to get started
      </Animated.Text>
      <Animated.View style={{ opacity: btnOpacity, marginTop: spacing.lg }}>
        <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.shopNowText}>Continue Shopping</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function QtyControl({ quantity, itemId, onRemove }: { quantity: number; itemId: string; onRemove: () => void }) {
  const dispatch = useAppDispatch();
  const [localQty, setLocalQty] = useState(quantity);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local in sync if Redux updates from outside
  useEffect(() => { setLocalQty(quantity); }, [quantity]);

  const handleChange = (newQty: number) => {
    if (newQty < 1) {
      onRemove();
      return;
    }
    haptic.light();
    setLocalQty(newQty); // instant UI update
    // Debounce API call by 400ms so rapid taps don't spam
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      dispatch(updateCartItem({ itemId, quantity: newQty }));
    }, 400);
  };

  return (
    <View style={styles.qtyControl}>
      <TouchableOpacity
        style={[styles.qtyBtn, localQty === 1 && styles.qtyBtnDelete]}
        onPress={() => handleChange(localQty - 1)}
      >
        {localQty === 1
          ? <Ionicons name="trash-outline" size={14} color={colors.error} />
          : <Ionicons name="remove" size={16} color={colors.text} />
        }
      </TouchableOpacity>
      <Text style={styles.qtyNum}>{localQty}</Text>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() => handleChange(localQty + 1)}
      >
        <Ionicons name="add" size={16} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

function CartItemCard({ item, onRemove, onSaveLater }: {
  item: CartItem;
  onRemove: () => void;
  onSaveLater: () => void;
}) {
  const itemTotal = (item.price ?? 0) * item.quantity;

  return (
    <View style={styles.itemCard}>
      {/* Image */}
      <TouchableOpacity onPress={() => router.push(`/product/${item.product?._id}`)}>
        {item.product?.images?.[0] ? (
          <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} contentFit="cover" />
        ) : (
          <View style={[styles.itemImage, styles.imgPlaceholder]}>
            <Ionicons name="image-outline" size={28} color={colors.border} />
          </View>
        )}
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.product?.title || 'Product'}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.itemPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
          {item.product?.compareAt && item.product.compareAt > (item.price ?? 0) && (
            <Text style={styles.mrpText}>MRP ₹{item.product.compareAt.toLocaleString()}</Text>
          )}
        </View>
        <Text style={styles.totalText}>Total: ₹{itemTotal.toLocaleString()}</Text>

        {/* Qty + Actions */}
        <View style={styles.bottomRow}>
          <QtyControl quantity={item.quantity} itemId={item._id} onRemove={onRemove} />
          <View style={styles.actionLinks}>
            <TouchableOpacity onPress={onSaveLater} style={styles.linkBtn}>
              <Text style={styles.linkText}>Save</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Remove Item', 'Remove this item from cart?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: onRemove },
                ]);
              }}
              style={styles.linkBtn}
            >
              <Text style={[styles.linkText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { cart, isLoading } = useAppSelector((s) => s.cart);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCart());
    loadSavedItems();
  }, [isAuthenticated]);

  useEffect(() => {
    productsApi.getRecommendations().then((res) => {
      setRecommended((res.data.data || []).slice(0, 6));
    }).catch(() => {});
  }, []);

  const loadSavedItems = async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_KEY);
      if (stored) setSavedItems(JSON.parse(stored));
    } catch {}
  };

  const saveLater = async (item: CartItem) => {
    haptic.medium();
    const updated = [...savedItems, item];
    setSavedItems(updated);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    dispatch(removeCartItem(item._id));
    showToast('info', 'Saved for Later', item.product?.title);
  };

  const moveBackToCart = async (item: CartItem) => {
    haptic.light();
    if (item.product?._id) {
      await dispatch(addToCart({ productId: item.product._id, quantity: item.quantity }));
      const updated = savedItems.filter((s) => s._id !== item._id);
      setSavedItems(updated);
      await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
      showToast('success', 'Moved to Cart', item.product?.title);
    }
  };

  const removeSaved = async (itemId: string) => {
    const updated = savedItems.filter((s) => s._id !== itemId);
    setSavedItems(updated);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  };

  const handleRemove = (itemId: string, title?: string) => {
    haptic.warning();
    dispatch(removeCartItem(itemId));
    showToast('info', 'Removed', title);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponApplying(true);
    await dispatch(applyCoupon(couponCode.trim()));
    setCouponApplying(false);
  };

  if (isLoading && !cart) return <LoadingScreen />;

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.container}>
        <AnimatedEmptyCart />
        {recommended.length > 0 && (
          <View style={styles.recSection}>
            <Text style={styles.recTitle}>Popular Products</Text>
            <FlatList
              data={recommended}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `rec-${item._id}`}
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
              renderItem={({ item, index }) => (
                <View style={{ marginRight: spacing.md }}>
                  <AnimatedProductCard product={item} index={index} />
                </View>
              )}
            />
          </View>
        )}
      </View>
    );
  }

  const subtotal = cart.totals?.subtotal ?? 0;
  const discount = cart.totals?.discount ?? 0;
  const tax = cart.totals?.tax ?? 0;
  const total = subtotal - discount + tax;

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 10 }}
        ListHeaderComponent={
          <Text style={styles.cartCount}>{cart.items.length} item{cart.items.length !== 1 ? 's' : ''} in cart</Text>
        }
        renderItem={({ item }) => (
          <CartItemCard
            item={item}
            onRemove={() => handleRemove(item._id, item.product?.title)}
            onSaveLater={() => saveLater(item)}
          />
        )}
        ListFooterComponent={
          <>
            {/* Saved for Later */}
            {savedItems.length > 0 && (
              <View style={styles.savedSection}>
                <Text style={styles.savedTitle}>Saved for Later ({savedItems.length})</Text>
                {savedItems.map((si) => (
                  <View key={si._id} style={styles.savedCard}>
                    {si.product?.images?.[0] ? (
                      <Image source={{ uri: si.product.images[0] }} style={styles.savedImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.savedImg, styles.imgPlaceholder]}>
                        <Ionicons name="image-outline" size={20} color={colors.border} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedItemTitle} numberOfLines={2}>{si.product?.title || 'Product'}</Text>
                      <Text style={styles.savedPrice}>₹{(si.price ?? 0).toLocaleString()}</Text>
                      <View style={styles.savedActions}>
                        <TouchableOpacity style={styles.moveBtn} onPress={() => moveBackToCart(si)}>
                          <Text style={styles.moveBtnText}>Move to Cart</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeSaved(si._id)}>
                          <Text style={[styles.linkText, { color: colors.error }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {recommended.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.recTitle}>You May Also Like</Text>
                <FlatList
                  data={recommended.slice(0, 4)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => `rec-${item._id}`}
                  contentContainerStyle={{ paddingHorizontal: spacing.md }}
                  renderItem={({ item, index }) => (
                    <View style={{ marginRight: spacing.md }}>
                      <AnimatedProductCard product={item} index={index} />
                    </View>
                  )}
                />
              </View>
            )}
          </>
        }
      />

      {/* Bottom summary */}
      <View style={[styles.summary, { paddingBottom: Math.max(bottomInset, spacing.md) }]}>
        {/* Coupon */}
        <View style={styles.couponRow}>
          <View style={styles.couponInput}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
            <TextInput
              style={{ flex: 1, fontSize: fontSize.sm, color: colors.text }}
              placeholder="Have a coupon code?"
              placeholderTextColor={colors.textSecondary}
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
              editable={!couponApplying}
            />
          </View>
          <TouchableOpacity
            style={styles.couponBtn}
            onPress={handleApplyCoupon}
            disabled={couponApplying}
          >
            <Text style={styles.couponBtnText}>{couponApplying ? '...' : 'Apply'}</Text>
          </TouchableOpacity>
        </View>

        {/* Price rows */}
        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow2}>
            <Text style={styles.priceLabel}>Price ({cart.items.length} items)</Text>
            <Text style={styles.priceVal}>₹{subtotal.toLocaleString()}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.priceRow2}>
              <Text style={styles.priceLabel}>Discount</Text>
              <Text style={[styles.priceVal, { color: colors.success }]}>-₹{discount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.priceRow2}>
            <Text style={styles.priceLabel}>Delivery</Text>
            <Text style={[styles.priceVal, { color: colors.textSecondary, fontStyle: 'italic' }]}>At checkout</Text>
          </View>
          <View style={styles.priceRow2}>
            <Text style={styles.priceLabel}>Tax (GST)</Text>
            <Text style={styles.priceVal}>₹{tax.toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalVal}>₹{total.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout' as any)}>
          <Ionicons name="lock-closed" size={18} color={colors.white} />
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },

  // Empty cart
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  shopNowBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full },
  shopNowText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold },

  // Shipping banner
  cartCount: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: fontWeight.medium },

  // Cart Item Card
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  itemImage: { width: 100, height: 100, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  itemPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  mrpText: { fontSize: fontSize.sm, color: colors.textSecondary, textDecorationLine: 'line-through' },
  totalText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },

  // Qty control (Amazon-style pill)
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  qtyBtn: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, alignItems: 'center', justifyContent: 'center' },
  qtyBtnDelete: {},
  qtyNum: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, minWidth: 28, textAlign: 'center' },

  // Action links
  actionLinks: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  linkBtn: { paddingHorizontal: spacing.xs, paddingVertical: 4 },
  linkText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  divider: { width: 1, height: 14, backgroundColor: colors.border },

  // Saved for later
  savedSection: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginTop: spacing.md, ...shadows.sm },
  savedTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  savedCard: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  savedImg: { width: 70, height: 70, borderRadius: borderRadius.md },
  savedItemTitle: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  savedPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xs },
  savedActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, alignItems: 'center' },
  moveBtn: { backgroundColor: colors.primaryLightest, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
  moveBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },

  // Recommendations
  recSection: { paddingBottom: spacing.xl },
  recTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginVertical: spacing.md, paddingHorizontal: spacing.md },

  // Summary bottom
  summary: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md, ...shadows.xl },
  couponRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  couponInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: '#fafafa' },
  couponBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  couponBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  priceBreakdown: { marginBottom: spacing.md },
  priceRow2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs + 2 },
  priceLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  priceVal: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, marginTop: spacing.xs, borderTopWidth: 1.5, borderTopColor: '#e0e0e0' },
  totalLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  totalVal: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, color: colors.text },

  checkoutBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md + 2, borderRadius: borderRadius.full, ...shadows.md },
  checkoutBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
});
