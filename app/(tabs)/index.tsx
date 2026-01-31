import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/api/products';
import { Product, Category } from '../../src/types';
import ProductCard from '../../src/components/product/ProductCard';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [featuredRes, catRes, newRes] = await Promise.all([
        productsApi.getFeatured(),
        productsApi.getCategories(),
        productsApi.getAll({ sort: '-createdAt', limit: 10 }),
      ]);
      setFeatured(featuredRes.data.data);
      setCategories(catRes.data.data);
      setNewArrivals(newRes.data.data);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/product/search' as any)}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <Text style={styles.searchText}>Search products...</Text>
      </TouchableOpacity>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => router.push({ pathname: '/product/list' as any, params: { category: item._id } })}
            >
              {item.image && <Image source={{ uri: item.image }} style={styles.categoryImage} />}
              <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Featured Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/product/list' as any, params: { featured: 'true' } })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={featured.slice(0, 6)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={{ marginRight: spacing.md }}>
              <ProductCard product={item} />
            </View>
          )}
        />
      </View>

      {/* New Arrivals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New Arrivals</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/product/list' as any, params: { sort: '-createdAt' } })}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.productGrid}>
          {newArrivals.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchText: { color: colors.textSecondary, fontSize: fontSize.md },
  section: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  viewAll: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  categoryCard: { alignItems: 'center', marginRight: spacing.md, width: 80 },
  categoryImage: { width: 60, height: 60, borderRadius: borderRadius.full, backgroundColor: colors.surface },
  categoryName: { fontSize: fontSize.xs, color: colors.text, marginTop: spacing.xs, textAlign: 'center' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
