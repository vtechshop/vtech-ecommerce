import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme';

interface FrequentlyBoughtTogetherProps {
  currentProduct: Product;
  similarProducts: Product[];
  onAddAllToCart: (productIds: string[]) => void;
}

export default function FrequentlyBoughtTogether({ currentProduct, similarProducts, onAddAllToCart }: FrequentlyBoughtTogetherProps) {
  if (similarProducts.length < 2) return null;

  const bundleItems = [currentProduct, similarProducts[0], similarProducts[1]];
  const bundleTotal = bundleItems.reduce((sum, p) => sum + p.price, 0);
  const bundleCompare = bundleItems.reduce((sum, p) => sum + (p.compareAt || p.price), 0);
  const bundleSaving = bundleCompare - bundleTotal;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Frequently Bought Together</Text>

      <View style={styles.productsRow}>
        {bundleItems.map((product, i) => (
          <React.Fragment key={product._id}>
            <TouchableOpacity
              style={styles.productItem}
              onPress={() => { if (i > 0) router.push(`/product/${product._id}`); }}
              activeOpacity={i === 0 ? 1 : 0.7}
            >
              {product.images?.[0] ? (
                <Image source={{ uri: product.images[0] }} style={styles.productImage} contentFit="cover" />
              ) : (
                <View style={[styles.productImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={20} color={colors.border} />
                </View>
              )}
              <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
              <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
            </TouchableOpacity>
            {i < 2 && (
              <View style={styles.plusContainer}>
                <Ionicons name="add-circle" size={22} color={colors.primaryLight} />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.totalSection}>
        <View>
          <Text style={styles.totalLabel}>Bundle Price</Text>
          <View style={styles.totalPriceRow}>
            <Text style={styles.totalPrice}>₹{bundleTotal.toLocaleString()}</Text>
            {bundleSaving > 0 && (
              <Text style={styles.savingText}>Save ₹{bundleSaving.toLocaleString()}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.addAllBtn}
          onPress={() => onAddAllToCart(bundleItems.map((p) => p._id))}
          activeOpacity={0.7}
        >
          <Ionicons name="cart-outline" size={16} color={colors.white} />
          <Text style={styles.addAllText}>Add All 3</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.sm },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  productsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  productItem: { flex: 1, alignItems: 'center' },
  productImage: { width: 70, height: 70, borderRadius: borderRadius.lg },
  productTitle: { fontSize: 10, color: colors.text, fontWeight: fontWeight.medium, textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: 2 },
  productPrice: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary, marginTop: 2 },
  plusContainer: { paddingHorizontal: 4, marginBottom: spacing.lg },
  totalSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surfaceDark },
  totalLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  totalPriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  totalPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.primary },
  savingText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.success },
  addAllBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.lg },
  addAllText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.white },
});
