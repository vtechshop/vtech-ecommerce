import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';
import { productsApi } from '../../src/api/products';
import { Product } from '../../src/types';

const COMPARE_STORAGE_KEY = '@vtech_compare_items';
const MAX_PRODUCTS = 3;
const { width } = Dimensions.get('window');

export default function CompareScreen() {
  const params = useLocalSearchParams<{ ids?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Load products from params or AsyncStorage
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      let productIds: string[] = [];

      // Check route params first
      if (params.ids) {
        productIds = params.ids.split(',');
      } else {
        // Fall back to AsyncStorage
        const stored = await AsyncStorage.getItem(COMPARE_STORAGE_KEY);
        if (stored) {
          productIds = JSON.parse(stored);
        }
      }

      if (productIds.length > 0) {
        const fetched: Product[] = [];
        for (const id of productIds.slice(0, MAX_PRODUCTS)) {
          try {
            const response = await productsApi.getById(id);
            if (response.data?.data) {
              fetched.push(response.data.data);
            }
          } catch {
            // Skip products that fail to load
          }
        }
        setProducts(fetched);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const saveToStorage = async (items: Product[]) => {
    try {
      const ids = items.map((p) => p._id);
      await AsyncStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Silent fail
    }
  };

  const removeProduct = (productId: string) => {
    const updated = products.filter((p) => p._id !== productId);
    setProducts(updated);
    saveToStorage(updated);
  };

  const addProduct = (product: Product) => {
    if (products.length >= MAX_PRODUCTS) return;
    if (products.find((p) => p._id === product._id)) return;
    const updated = [...products, product];
    setProducts(updated);
    saveToStorage(updated);
    setSearchModalVisible(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const response = await productsApi.search(query);
      if (response.data?.data) {
        setSearchResults(response.data.data);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Find lowest price product
  const lowestPriceId = products.length > 1
    ? products.reduce((min, p) => (p.price < min.price ? p : min), products[0])?._id
    : null;

  // Collect all unique spec labels across products
  const specLabels: string[] = [];
  products.forEach((p) => {
    (p.specifications || []).forEach((spec) => {
      if (!specLabels.includes(spec.label)) {
        specLabels.push(spec.label);
      }
    });
  });

  const cardWidth = products.length > 0
    ? (width - spacing.lg * 2 - spacing.sm * (products.length - 1)) / products.length
    : width - spacing.lg * 2;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compare Products</Text>
          <Text style={styles.headerSubtitle}>
            {products.length}/{MAX_PRODUCTS} products added
          </Text>
        </View>

        {products.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="git-compare-outline" size={56} color={colors.border} />
            </View>
            <Text style={styles.emptyTitle}>No products to compare</Text>
            <Text style={styles.emptySubtitle}>
              Add products to compare their features, prices, and specifications side by side.
            </Text>
            <TouchableOpacity
              style={styles.addProductButton}
              onPress={() => setSearchModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.white} />
              <Text style={styles.addProductButtonText}>Add Products to Compare</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Product Cards - Side by Side */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
            >
              {products.map((product) => (
                <View
                  key={product._id}
                  style={[
                    styles.productCard,
                    { width: Math.max(cardWidth, 140) },
                    lowestPriceId === product._id && styles.bestValueCard,
                  ]}
                >
                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeProduct(product._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.error} />
                  </TouchableOpacity>

                  {/* Best Value Badge */}
                  {lowestPriceId === product._id && (
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>Best Value</Text>
                    </View>
                  )}

                  {/* Image */}
                  <Image
                    source={{
                      uri: product.images?.[0] || 'https://via.placeholder.com/150',
                    }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />

                  {/* Title */}
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {product.title}
                  </Text>

                  {/* Price */}
                  <View style={styles.priceRow}>
                    <Text
                      style={[
                        styles.productPrice,
                        lowestPriceId === product._id && styles.bestPrice,
                      ]}
                    >
                      &#8377;{product.price.toLocaleString('en-IN')}
                    </Text>
                    {product.compareAt && product.compareAt > product.price && (
                      <Text style={styles.compareAtPrice}>
                        &#8377;{product.compareAt.toLocaleString('en-IN')}
                      </Text>
                    )}
                  </View>

                  {/* Rating */}
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={colors.secondary} />
                    <Text style={styles.ratingText}>
                      {product.rating.toFixed(1)}
                    </Text>
                    <Text style={styles.reviewCount}>
                      ({product.reviewCount})
                    </Text>
                  </View>

                  {/* Brand */}
                  {product.brand && (
                    <Text style={styles.brandText}>{product.brand}</Text>
                  )}

                  {/* Stock Status */}
                  <View style={styles.stockRow}>
                    <View
                      style={[
                        styles.stockDot,
                        { backgroundColor: product.stock > 0 ? colors.success : colors.error },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stockText,
                        { color: product.stock > 0 ? colors.success : colors.error },
                      ]}
                    >
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Add Product Placeholder */}
              {products.length < MAX_PRODUCTS && (
                <TouchableOpacity
                  style={[styles.addCard, { width: Math.max(cardWidth, 140) }]}
                  onPress={() => setSearchModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={36} color={colors.primary} />
                  <Text style={styles.addCardText}>Add Product</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Specifications Comparison Table */}
            {specLabels.length > 0 && (
              <View style={styles.specsSection}>
                <Text style={styles.specsSectionTitle}>Specifications</Text>
                <View style={styles.specsTable}>
                  {/* Table Header */}
                  <View style={styles.specsRow}>
                    <View style={styles.specLabelCell}>
                      <Text style={styles.specLabelHeader}>Feature</Text>
                    </View>
                    {products.map((product) => (
                      <View key={product._id} style={styles.specValueCell}>
                        <Text style={styles.specValueHeader} numberOfLines={1}>
                          {product.title.split(' ').slice(0, 2).join(' ')}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Table Rows */}
                  {specLabels.map((label, index) => (
                    <View
                      key={label}
                      style={[
                        styles.specsRow,
                        index % 2 === 0 && styles.specsRowAlt,
                      ]}
                    >
                      <View style={styles.specLabelCell}>
                        <Text style={styles.specLabelText}>{label}</Text>
                      </View>
                      {products.map((product) => {
                        const spec = product.specifications?.find(
                          (s) => s.label === label
                        );
                        return (
                          <View key={product._id} style={styles.specValueCell}>
                            <Text style={styles.specValueText}>
                              {spec?.value || '-'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search Products</Text>
            <TouchableOpacity
              onPress={() => {
                setSearchModalVisible(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for products..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {searching && (
            <ActivityIndicator
              style={styles.searchingIndicator}
              size="small"
              color={colors.primary}
            />
          )}

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.searchResultsList}
            ListEmptyComponent={
              searchQuery.length >= 2 && !searching ? (
                <Text style={styles.noResultsText}>No products found</Text>
              ) : null
            }
            renderItem={({ item }) => {
              const alreadyAdded = products.some((p) => p._id === item._id);
              return (
                <TouchableOpacity
                  style={[
                    styles.searchResultItem,
                    alreadyAdded && styles.searchResultItemDisabled,
                  ]}
                  onPress={() => !alreadyAdded && addProduct(item)}
                  disabled={alreadyAdded}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{
                      uri: item.images?.[0] || 'https://via.placeholder.com/60',
                    }}
                    style={styles.searchResultImage}
                    resizeMode="contain"
                  />
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.searchResultPrice}>
                      &#8377;{item.price.toLocaleString('en-IN')}
                    </Text>
                    {item.brand && (
                      <Text style={styles.searchResultBrand}>{item.brand}</Text>
                    )}
                  </View>
                  {alreadyAdded ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  addProductButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Product Cards
  cardsContainer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  productCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  bestValueCard: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    zIndex: 1,
  },
  bestValueBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  bestValueText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  productTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  priceRow: {
    marginBottom: spacing.xs,
  },
  productPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  bestPrice: {
    color: colors.success,
  },
  compareAtPrice: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  reviewCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  brandText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },

  // Add Card
  addCard: {
    backgroundColor: colors.primaryLightest,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primaryLighter,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  addCardText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.sm,
  },

  // Specs Table
  specsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  specsSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  specsTable: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  specsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specsRowAlt: {
    backgroundColor: colors.surface,
  },
  specLabelCell: {
    flex: 1,
    padding: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: 'center',
  },
  specValueCell: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specLabelHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  specValueHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  specLabelText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  specValueText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  searchingIndicator: {
    marginVertical: spacing.md,
  },
  searchResultsList: {
    paddingHorizontal: spacing.lg,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingVertical: spacing.xl,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  searchResultItemDisabled: {
    opacity: 0.6,
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  searchResultPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: 2,
  },
  searchResultBrand: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
