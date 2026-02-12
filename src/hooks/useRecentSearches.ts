import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'vtech_recent_searches';
const MAX_ITEMS = 10;

export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    loadSearches();
  }, []);

  const loadSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setSearches(JSON.parse(stored));
    } catch {}
  };

  const addSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let list: string[] = stored ? JSON.parse(stored) : [];
      list = list.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      list.unshift(trimmed);
      if (list.length > MAX_ITEMS) list = list.slice(0, MAX_ITEMS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setSearches(list);
    } catch {}
  }, []);

  const removeSearch = useCallback(async (query: string) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let list: string[] = stored ? JSON.parse(stored) : [];
      list = list.filter((s) => s !== query);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setSearches(list);
    } catch {}
  }, []);

  const clearAll = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSearches([]);
  }, []);

  return { searches, addSearch, removeSearch, clearAll };
}
