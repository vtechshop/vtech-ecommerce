import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../src/store';
import { fetchCart, updateCartItem, removeCartItem, applyCoupon } from '../../src/store/slices/cartSlice';
import Button from '../../src/components/ui/Button';
import Input from '../../src/components/ui/Input';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';
import { CartItem } from '../../src/types';

export default function CartScreen() {
  const dispatch = useAppDispatch();
  const { cart, isLoading } = useAppSelector((s) => s.cart);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [couponCode, setCouponCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCart());
  }, [isAuthenticated]);

  if (isLoading && !cart) return <LoadingScreen />;

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cart-outline" size={80} color={colors.border} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptyText}>Browse products and add items to your cart</Text>
        <Button title="Shop Now" onPress={() => router.push('/(tabs)')} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.item}>
      <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.product.title}</Text>
        <Text style={styles.itemPrice}>₹{item.price.toLocaleString()}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => item.quantity > 1 && dispatch(updateCartItem({ itemId: item._id, quantity: item.quantity - 1 }))}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => dispatch(updateCartItem({ itemId: item._id, quantity: item.quantity + 1 }))}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Remove Item', 'Remove this item from cart?', [
              { text: 'Cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeCartItem(item._id)) },
            ])}
            style={styles.removeBtn}
          >
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
          <Text style={styles.summaryValue}>₹{cart.totals.subtotal.toLocaleString()}</Text>
        </View>
        {cart.totals.discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>-₹{cart.totals.discount.toLocaleString()}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>₹{cart.totals.tax.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{cart.totals.total.toLocaleString()}</Text>
        </View>
        <Button title="Proceed to Checkout" onPress={() => router.push('/checkout' as any)} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  item: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  itemImage: { width: 80, height: 80, borderRadius: borderRadius.md },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemTitle: { fontSize: fontSize.sm, fontWeight: '500', color: colors.text },
  itemPrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  qtyBtn: { width: 30, height: 30, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: fontSize.md, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto' },
  couponRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.md, gap: spacing.sm },
  summary: { padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  summaryValue: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  totalLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary },
});
