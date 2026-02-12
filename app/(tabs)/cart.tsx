import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchCart, updateCartItem, removeCartItem, applyCoupon, addToCart } from '../../src/store/slices/cartSlice';
import { productsApi } from '../../src/api/products';
import { Product, CartItem } from '../../src/types';
import AnimatedProductCard from '../../src/components/product/AnimatedProductCard';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { useToast } from '../../src/components/ui/Toast';
import { haptic } from '../../src/utils/haptics';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows, letterSpacing } from '../../src/theme';

const FREE_SHIPPING_THRESHOLD = 999;
const SAVED_KEY = '@vtech_saved_for_later';

export default function CartScreen() {
  const dispatch = useAppDispatch();
  const { cart, isLoading } = useAppSelector((s) => s.cart);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [couponCode, setCouponCode] = useState('');
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
    haptic.light();
    const updated = savedItems.filter((s) => s._id !== itemId);
    setSavedItems(updated);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    showToast('info', 'Item removed');
  };

  if (isLoading && !cart) return <LoadingScreen />;

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={40} color={colors.primaryLight} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Browse products and add items to your cart</Text>
          <Button title="Shop Now" onPress={() => router.push('/(tabs)')} style={{ marginTop: spacing.lg }} />
        </View>
        {/* Recommended even when cart is empty */}
        {recommended.length > 0 && (
          <View style={styles.recommendSection}>
            <Text style={styles.recommendTitle}>Popular Products</Text>
            <FlatList
              data={recommended}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `rec-${item._id}`}
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
              renderItem={({ item, index }) => (
                <View style={{ marginRight: spacing.md }}><AnimatedProductCard product={item} index={index} /></View>
              )}
            />
          </View>
        )}
      </View>
    );
  }

  const subtotal = cart.totals?.subtotal ?? 0;
  const shippingProgress = Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1);
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.item}>
      {item.product?.images?.[0] ? (
        <TouchableOpacity onPress={() => router.push(`/product/${item.product?._id}`)}>
          <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.itemImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="image-outline" size={24} color={colors.border} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.product?.title || 'Product'}</Text>
        <Text style={styles.itemPrice}>₹{(item.price ?? 0).toLocaleString()}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => item.quantity > 1 && dispatch(updateCartItem({ itemId: item._id, quantity: item.quantity - 1 }))}
          >
            <Ionicons name="remove" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => dispatch(updateCartItem({ itemId: item._id, quantity: item.quantity + 1 }))}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {/* Save for Later + Remove */}
        <View style={styles.itemActions}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => saveLater(item)}>
            <Ionicons name="bookmark-outline" size={14} color={colors.info} />
            <Text style={styles.saveBtnText}>Save for Later</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { haptic.warning(); dispatch(removeCartItem(item._id)); showToast('info', 'Item removed'); }}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md }}
        ListHeaderComponent={
          /* Free Shipping Indicator */
          amountToFreeShipping > 0 ? (
            <View style={styles.shippingBanner}>
              <View style={styles.shippingRow}>
                <Ionicons name="car-outline" size={18} color={colors.info} />
                <Text style={styles.shippingText}>
                  Add ₹{amountToFreeShipping.toLocaleString()} more for <Text style={styles.shippingBold}>free shipping!</Text>
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${shippingProgress * 100}%` }]} />
              </View>
            </View>
          ) : (
            <View style={styles.freeShippingBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.freeShippingText}>You've unlocked free shipping!</Text>
            </View>
          )
        }
        ListFooterComponent={
          <>
            {/* Saved for Later Section */}
            {savedItems.length > 0 && (
              <View style={styles.savedSection}>
                <View style={styles.savedHeader}>
                  <Ionicons name="bookmark" size={18} color={colors.info} />
                  <Text style={styles.savedTitle}>Saved for Later ({savedItems.length})</Text>
                </View>
                {savedItems.map((si) => (
                  <View key={si._id} style={styles.item}>
                    {si.product?.images?.[0] ? (
                      <Image source={{ uri: si.product.images[0] }} style={styles.itemImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.itemImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="image-outline" size={24} color={colors.border} />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{si.product?.title || 'Product'}</Text>
                      <Text style={styles.itemPrice}>₹{(si.price ?? 0).toLocaleString()}</Text>
                      <View style={styles.itemActions}>
                        <TouchableOpacity style={styles.moveBtn} onPress={() => moveBackToCart(si)}>
                          <Ionicons name="cart-outline" size={14} color={colors.white} />
                          <Text style={styles.moveBtnText}>Move to Cart</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeSaved(si._id)}>
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {/* Recommendations */}
            {recommended.length > 0 && (
              <View style={styles.recommendInCart}>
                <Text style={styles.recommendTitle}>You Might Also Like</Text>
                <FlatList
                  data={recommended.slice(0, 4)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => `rec-${item._id}`}
                  renderItem={({ item, index }) => (
                    <View style={{ marginRight: spacing.md }}><AnimatedProductCard product={item} index={index} /></View>
                  )}
                />
              </View>
            )}
          </>
        }
      />
      {/* Coupon */}
      <View style={styles.couponRow}>
        <View style={{ flex: 1 }}>
          <Input placeholder="Coupon code" value={couponCode} onChangeText={setCouponCode} />
        </View>
        <Button title="Apply" size="sm" onPress={() => couponCode && dispatch(applyCoupon(couponCode))} />
      </View>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
        </View>
        {(cart.totals?.discount ?? 0) > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>-₹{(cart.totals?.discount ?? 0).toLocaleString()}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>₹{(cart.totals?.tax ?? 0).toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={[styles.summaryValue, subtotal >= FREE_SHIPPING_THRESHOLD ? { color: colors.success } : {}]}>
            {subtotal >= FREE_SHIPPING_THRESHOLD ? 'FREE' : `₹${(cart.totals?.shipping ?? 0).toLocaleString()}`}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{(cart.totals?.total ?? 0).toLocaleString()}</Text>
        </View>
        <Button title="Proceed to Checkout" onPress={() => router.push('/checkout' as any)} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  // Shipping indicator
  shippingBanner: { backgroundColor: colors.infoLight, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md },
  shippingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shippingText: { fontSize: fontSize.sm, color: colors.info, flex: 1 },
  shippingBold: { fontWeight: fontWeight.bold },
  progressBar: { height: 4, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 2, marginTop: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.info, borderRadius: 2 },
  freeShippingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successLight, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md },
  freeShippingText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold },
  // Items
  item: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  itemImage: { width: 80, height: 80, borderRadius: borderRadius.lg },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  itemPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, marginTop: spacing.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  qtyBtn: { width: 32, height: 32, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.primaryLighter, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, minWidth: 24, textAlign: 'center' },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.infoLight, borderRadius: borderRadius.full },
  saveBtnText: { fontSize: fontSize.xs, color: colors.info, fontWeight: fontWeight.semibold },
  moveBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, backgroundColor: colors.primary, borderRadius: borderRadius.full },
  moveBtnText: { fontSize: fontSize.xs, color: colors.white, fontWeight: fontWeight.semibold },
  savedSection: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 2, borderTopColor: colors.surfaceDark },
  savedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  savedTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  // Recommend
  recommendSection: { paddingVertical: spacing.lg },
  recommendInCart: { marginTop: spacing.md, marginBottom: spacing.md },
  recommendTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md, paddingHorizontal: spacing.md },
  // Coupon
  couponRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.md, gap: spacing.sm },
  // Summary
  summary: { padding: spacing.md, backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xxl, borderTopRightRadius: borderRadius.xxl, ...shadows.xl },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  summaryValue: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.surfaceDark, paddingTop: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  totalLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.text, letterSpacing: letterSpacing.tight },
  totalValue: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.primary, letterSpacing: letterSpacing.tight },
});
