import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

const STORAGE_KEY = 'vtech_recently_viewed';
const MAX_ITEMS = 15;

interface RecentlyViewedItem {
  _id: string;
  title: string;
  price: number;
  compareAt?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  slug: string;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  };

  const addItem = useCallback(async (product: Product) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let list: RecentlyViewedItem[] = stored ? JSON.parse(stored) : [];
      // Remove if already exists
      list = list.filter((i) => i._id !== product._id);
      // Add to front
      list.unshift({
        _id: product._id,
        title: product.title,
        price: product.price,
        compareAt: product.compareAt,
        images: product.images?.slice(0, 1) || [],
        rating: product.rating,
        reviewCount: product.reviewCount,
        slug: product.slug,
      });
      // Trim
      if (list.length > MAX_ITEMS) list = list.slice(0, MAX_ITEMS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setItems(list);
    } catch {}
  }, []);

  const clearAll = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  return { items, addItem, clearAll, refresh: loadItems };
}
