import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../src/api/products';
import { Category } from '../../src/types';
import LoadingScreen from '../../src/components/ui/LoadingScreen';
import { colors, spacing, fontSize, borderRadius } from '../../src/theme';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi.getCategories().then((res) => {
      setCategories(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <FlatList
      style={styles.container}
      data={categories}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: '/product/list' as any, params: { category: item._id, title: item.name } })}
        >
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="grid" size={24} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  image: { width: 50, height: 50, borderRadius: borderRadius.md },
  placeholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
});
