import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/api/products';
import { Category } from '../../src/types';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius, fontWeight, shadows } from '../../src/theme';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setError(null);
    try {
      const res = await productsApi.getCategories();
      setCategories(res.data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load categories');
    }
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, []);

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <View style={styles.empty}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); loadCategories(); }} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={categories}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: spacing.md }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: '/product/list' as any, params: { category: item._id, title: item.name } })}
        >
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="grid" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
          </View>
          <View style={styles.chevronCircle}>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  image: { width: 50, height: 50, borderRadius: borderRadius.lg },
  placeholder: { backgroundColor: colors.primaryLightest, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' as const },
  retryBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg },
  retryText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
});
